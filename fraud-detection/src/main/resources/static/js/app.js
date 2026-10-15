// =====================================================================
//  FraudShield frontend - plain JavaScript, talks to the Spring Boot API
// =====================================================================

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

const state = {
    token: localStorage.getItem("token"),
    user: JSON.parse(localStorage.getItem("user") || "null"),
};

// ---------- helpers ----------

/** Escape text before putting it into HTML (prevents XSS). */
function esc(value) {
    return String(value ?? "").replace(/[&<>"']/g, (c) =>
        ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

const money = (n) => "₹" + Number(n).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const dateTime = (s) => (s ? new Date(s).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "—");
const badge = (text) => `<span class="badge badge-${esc(text)}">${esc(String(text).replace("_", " "))}</span>`;
const scoreColor = (s) => (s >= 70 ? "var(--red)" : s >= 40 ? "var(--amber)" : "var(--green)");

function toast(message, isError = false) {
    const t = $("#toast");
    t.textContent = message;
    t.className = "toast" + (isError ? " error" : "");
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => t.classList.add("hidden"), 3500);
}

/** Calls the API with the JWT token. Logs out automatically if the token is invalid. */
async function api(method, url, body) {
    const headers = { "Content-Type": "application/json" };
    if (state.token) headers.Authorization = "Bearer " + state.token;

    const res = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined });

    if (res.status === 401 && state.token) {
        logout();
        throw new Error("Session expired - please log in again");
    }
    const data = res.status === 204 ? null : await res.json().catch(() => null);
    if (!res.ok) {
        let msg = data?.message || `Request failed (${res.status})`;
        if (data?.fields) msg += ": " + Object.entries(data.fields).map(([k, v]) => `${k} ${v}`).join(", ");
        if (res.status === 403) msg = "You don't have permission to do that";
        throw new Error(msg);
    }
    return data;
}

// ---------- auth ----------

function saveSession(auth) {
    state.token = auth.token;
    state.user = { name: auth.name, email: auth.email, role: auth.role };
    localStorage.setItem("token", state.token);
    localStorage.setItem("user", JSON.stringify(state.user));
}

function logout() {
    state.token = null;
    state.user = null;
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    render();
}

$$("[data-auth-tab]").forEach((tab) =>
    tab.addEventListener("click", () => {
        $$("[data-auth-tab]").forEach((t) => t.classList.toggle("active", t === tab));
        $("#login-form").classList.toggle("hidden", tab.dataset.authTab !== "login");
        $("#register-form").classList.toggle("hidden", tab.dataset.authTab !== "register");
        $("#auth-error").classList.add("hidden");
    }));

async function handleAuth(e, url) {
    e.preventDefault();
    const form = e.target;
    const btn = form.querySelector("button[type=submit]");
    btn.disabled = true;
    $("#auth-error").classList.add("hidden");
    try {
        const auth = await api("POST", url, Object.fromEntries(new FormData(form)));
        saveSession(auth);
        form.reset();
        render();
    } catch (err) {
        $("#auth-error").textContent = err.message;
        $("#auth-error").classList.remove("hidden");
    } finally {
        btn.disabled = false;
    }
}

$("#login-form").addEventListener("submit", (e) => handleAuth(e, "/api/auth/login"));
$("#register-form").addEventListener("submit", (e) => handleAuth(e, "/api/auth/register"));
$("#logout-btn").addEventListener("click", logout);

// ---------- navigation ----------

const VIEWS = {
    dashboard: { label: "Dashboard", admin: true, load: loadDashboard },
    cases: { label: "Fraud Cases", admin: true, load: loadCases },
    all: { label: "All Transactions", admin: true, load: loadAllTransactions },
    users: { label: "Users", admin: true, load: loadUsers },
    new: { label: "New Transaction", admin: false, load: () => {} },
    mine: { label: "My Transactions", admin: false, load: loadMyTransactions },
};

function showView(name) {
    Object.keys(VIEWS).forEach((v) => $("#view-" + v).classList.toggle("hidden", v !== name));
    $$("#nav button").forEach((b) => b.classList.toggle("active", b.dataset.view === name));
    VIEWS[name].load().catch?.((err) => toast(err.message, true));
}

function render() {
    const loggedIn = !!state.token && !!state.user;
    $("#auth-screen").classList.toggle("hidden", loggedIn);
    $("#app-screen").classList.toggle("hidden", !loggedIn);
    if (!loggedIn) return;

    const isAdmin = state.user.role === "ADMIN";
    $("#user-name").textContent = state.user.name;
    $("#user-role").textContent = state.user.role;
    $("#user-role").className = "badge badge-" + state.user.role;

    const nav = $("#nav");
    nav.innerHTML = "";
    Object.entries(VIEWS)
        .filter(([, v]) => isAdmin || !v.admin)
        .forEach(([key, v]) => {
            const b = document.createElement("button");
            b.textContent = v.label;
            b.dataset.view = key;
            b.addEventListener("click", () => showView(key));
            nav.appendChild(b);
        });

    showView(isAdmin ? "dashboard" : "new");
}

// ---------- new transaction ----------

const SAMPLES = {
    normal: { amount: 750, merchant: "Amazon", location: "Delhi", deviceId: "phone-1" },
    suspicious: { amount: 150000, merchant: "Crypto Exchange", location: "Lagos", deviceId: "unknown-laptop" },
};

$$("[data-fill]").forEach((b) =>
    b.addEventListener("click", () => {
        const sample = SAMPLES[b.dataset.fill];
        Object.entries(sample).forEach(([k, v]) => ($("#tx-form").elements[k].value = v));
    }));

$("#tx-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const form = e.target;
    const btn = form.querySelector("button[type=submit]");
    btn.disabled = true;
    try {
        const body = Object.fromEntries(new FormData(form));
        body.amount = Number(body.amount);
        const tx = await api("POST", "/api/transactions", body);
        showResult(tx);
    } catch (err) {
        toast(err.message, true);
    } finally {
        btn.disabled = false;
    }
});

function showResult(tx) {
    const messages = {
        APPROVED: "✅ Looks safe – transaction approved.",
        FLAGGED: "⚠️ Suspicious – sent to an admin for review.",
        BLOCKED: "⛔ High risk – transaction blocked and sent for review.",
    };
    const reasons = tx.reasons?.length
        ? `<ul class="reasons">${tx.reasons.map((r) => `<li>${esc(r)}</li>`).join("")}</ul>`
        : `<p class="muted">No risk factors detected.</p>`;

    const box = $("#tx-result");
    box.className = "card";
    box.innerHTML = `
        <div class="muted">${money(tx.amount)} at ${esc(tx.merchant)}</div>
        <div class="result-status status-${esc(tx.status)}">${esc(tx.status)}</div>
        <div>${messages[tx.status] || ""}</div>
        <div class="score">
            <div class="score-label"><span>Risk score</span><strong>${tx.riskScore} / 100</strong></div>
            <div class="score-track"><div class="score-fill" style="width:0;background:${scoreColor(tx.riskScore)}"></div></div>
        </div>
        <h3>Why?</h3>
        ${reasons}`;
    requestAnimationFrame(() => (box.querySelector(".score-fill").style.width = tx.riskScore + "%"));
}

// ---------- tables ----------

function txTable(table, rows, showUser) {
    const head = `<tr><th>ID</th>${showUser ? "<th>User</th>" : ""}<th>Date</th><th>Merchant</th>
        <th>Location</th><th>Device</th><th class="num">Amount</th><th class="num">Risk</th><th>Status</th></tr>`;
    const body = rows.length
        ? rows.map((t) => `<tr>
            <td>#${t.id}</td>
            ${showUser ? `<td>${esc(t.userEmail)}</td>` : ""}
            <td>${dateTime(t.timestamp)}</td>
            <td>${esc(t.merchant)}</td>
            <td>${esc(t.location || "—")}</td>
            <td>${esc(t.deviceId || "—")}</td>
            <td class="num">${money(t.amount)}</td>
            <td class="num" style="color:${scoreColor(t.riskScore)};font-weight:700">${t.riskScore}</td>
            <td>${badge(t.status)}</td></tr>`).join("")
        : `<tr class="empty-row"><td colspan="9">No transactions yet</td></tr>`;
    table.innerHTML = head + body;
}

async function loadMyTransactions() {
    txTable($("#mine-table"), await api("GET", "/api/transactions"), false);
}

async function loadAllTransactions() {
    txTable($("#all-table"), await api("GET", "/api/admin/transactions"), true);
}

// ---------- admin: dashboard ----------

async function loadDashboard() {
    const d = await api("GET", "/api/admin/dashboard");
    const stats = [
        ["Total users", d.totalUsers],
        ["Transactions", d.totalTransactions],
        ["Open cases", d.openCases, "var(--amber)"],
        ["Confirmed fraud", d.confirmedFraud, "var(--red)"],
        ["False positives", d.falsePositives, "var(--green)"],
    ];
    $("#stats").innerHTML = stats.map(([label, value, color]) => `
        <div class="stat"><div class="stat-label">${label}</div>
        <div class="stat-value" style="${color ? "color:" + color : ""}">${value}</div></div>`).join("");

    const total = d.approved + d.flagged + d.blocked || 1;
    const parts = [["Approved", d.approved, "var(--green)"], ["Flagged", d.flagged, "var(--amber)"], ["Blocked", d.blocked, "var(--red)"]];
    $("#outcome-bar").innerHTML = parts.map(([, n, c]) => `<div style="width:${(n / total) * 100}%;background:${c}"></div>`).join("");
    $("#outcome-legend").innerHTML = parts.map(([l, n, c]) => `<span style="--c:${c}">${l}: ${n}</span>`).join("");
}

// ---------- admin: fraud cases ----------

$("#case-filter").addEventListener("change", () => loadCases().catch((err) => toast(err.message, true)));

async function loadCases() {
    const status = $("#case-filter").value;
    const cases = await api("GET", "/api/admin/fraud-cases" + (status ? "?status=" + status : ""));
    const list = $("#cases-list");

    if (!cases.length) {
        list.innerHTML = `<div class="card muted" style="text-align:center">No cases here 🎉</div>`;
        return;
    }
    list.innerHTML = cases.map((c) => {
        const t = c.transaction;
        const actions = c.status === "OPEN"
            ? `<button class="btn btn-danger btn-sm" data-review="${c.id}" data-status="CONFIRMED_FRAUD">Confirm fraud</button>
               <button class="btn btn-success btn-sm" data-review="${c.id}" data-status="FALSE_POSITIVE">False positive</button>`
            : `<button class="btn btn-ghost btn-sm" data-review="${c.id}" data-status="OPEN">Re-open</button>`;
        const review = c.reviewedBy
            ? `<div class="case-review">Reviewed by ${esc(c.reviewedBy)} on ${dateTime(c.reviewedAt)}${c.adminNotes ? ` — “${esc(c.adminNotes)}”` : ""}</div>`
            : "";
        return `
            <div class="card case">
                <div class="case-score" style="--c:${scoreColor(c.riskScore)}">${c.riskScore}</div>
                <div>
                    <div class="case-title">${money(t.amount)} at ${esc(t.merchant)} ${badge(c.status)}</div>
                    <div class="case-meta">Case #${c.id} · ${esc(t.userEmail)} · ${esc(t.location || "no location")} ·
                        ${esc(t.deviceId || "no device")} · ${dateTime(c.createdAt)}</div>
                    <ul class="reasons">${c.reasons.map((r) => `<li>${esc(r)}</li>`).join("")}</ul>
                    ${review}
                </div>
                <div class="case-actions">${actions}</div>
            </div>`;
    }).join("");

    list.querySelectorAll("[data-review]").forEach((b) => b.addEventListener("click", () => reviewCase(b)));
}

async function reviewCase(btn) {
    const status = btn.dataset.status;
    const notes = status === "OPEN" ? null : prompt("Add a note for this decision (optional):", "");
    if (notes === null && status !== "OPEN") return; // admin pressed Cancel
    btn.disabled = true;
    try {
        await api("PUT", `/api/admin/fraud-cases/${btn.dataset.review}/review`, { status, notes });
        toast("Case updated");
        await loadCases();
    } catch (err) {
        toast(err.message, true);
        btn.disabled = false;
    }
}

// ---------- admin: users ----------

async function loadUsers() {
    const users = await api("GET", "/api/admin/users");
    const table = $("#users-table");
    table.innerHTML = `<tr><th>ID</th><th>Name</th><th>Email</th><th>Role</th><th>Joined</th><th></th></tr>` +
        users.map((u) => {
            const isMe = u.email === state.user.email;
            const newRole = u.role === "ADMIN" ? "USER" : "ADMIN";
            return `<tr>
                <td>#${u.id}</td><td>${esc(u.name)}${isMe ? ' <span class="muted">(you)</span>' : ""}</td>
                <td>${esc(u.email)}</td><td>${badge(u.role)}</td><td>${dateTime(u.createdAt)}</td>
                <td><button class="btn btn-ghost btn-sm" data-user="${u.id}" data-role="${newRole}" ${isMe ? "disabled" : ""}>
                    ${newRole === "ADMIN" ? "Make admin" : "Remove admin"}</button></td></tr>`;
        }).join("");

    table.querySelectorAll("[data-user]").forEach((b) => b.addEventListener("click", async () => {
        b.disabled = true;
        try {
            await api("PUT", `/api/admin/users/${b.dataset.user}/role`, { role: b.dataset.role });
            toast("Role updated");
            await loadUsers();
        } catch (err) {
            toast(err.message, true);
            b.disabled = false;
        }
    }));
}

// ---------- start ----------
render();
