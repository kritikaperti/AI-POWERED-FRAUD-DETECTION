

document.addEventListener("DOMContentLoaded", function () {

    /* ================= HELPERS ================= */

    function $(id) { return document.getElementById(id); }

    function escapeHtml(text) {
        return String(text == null ? "" : text)
            .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
    }

    function readJSON(key, fallback) {
        try {
            const v = JSON.parse(localStorage.getItem(key));
            return v === null || v === undefined ? fallback : v;
        } catch (e) { return fallback; }
    }

    function showMessage(el, text, color) {
        el.textContent = text;
        el.style.color = color;
    }

    function money(v) { return "₹" + Number(v).toLocaleString("en-IN"); }

    function norm(v) { return String(v == null ? "" : v).trim().toLowerCase(); }

    function clearLogin() {
        localStorage.removeItem("fraudGuardLoggedIn");
        localStorage.removeItem("fraudGuardAdminLoggedIn");
    }

    /* ================= PAGE INFO + KEYS ================= */

    const pageName = (window.location.pathname.split("/").pop() || "index.html")
        .toLowerCase().replace(/\.html$/, "");

    const isAdminPage = pageName === "admin" || pageName.indexOf("admin-") === 0;

    const userPages = ["user-dashboard", "transaction", "history", "alerts", "profile"];

    const KEY_USER_PROFILE = "fraudGuardProfile";      // abhi login user
    const KEY_USER_PASS = "fraudGuardPassword";
    const KEY_ADMIN_PROFILE = "fraudGuardAdminProfile"; // abhi login admin
    const KEY_ADMIN_PASS = "fraudGuardAdminPassword";
    const KEY_USERS = "fraudGuardUsers";                // sab registered users
    const KEY_ADMINS = "fraudGuardAdmins";              // sab registered admins
    const KEY_TXNS = "fraudGuardTransactions";

    const DEFAULT_USER = {
        name: "USER", email: "user@fraudguard.com",
        phone: "+91 XXXXX XXXXX", username: "USER"
    };

    const DEFAULT_ADMIN = {
        name: "Admin Officer", email: "admin@fraudguard.com", phone: "",
        username: "admin", adminId: "FG-ADM-001",
        role: "System Administrator",
        department: "Fraud Detection & Security", accessLevel: "Full Access"
    };

    const RESERVED_USERNAMES = ["admin", "user"];

    /* ================= USERS / ADMINS LIST ================= */

    function getList(key) {
        const list = readJSON(key, []);
        return Array.isArray(list) ? list : [];
    }

    function saveList(key, list) {
        localStorage.setItem(key, JSON.stringify(list));
    }

    function usernameTaken(username) {
        const u = norm(username);
        if (u === "") return false;
        if (RESERVED_USERNAMES.indexOf(u) !== -1) return true;
        return getList(KEY_USERS).concat(getList(KEY_ADMINS)).some(function (x) {
            return norm(x.username) === u;
        });
    }

    function emailTaken(email) {
        const e = norm(email);
        if (e === DEFAULT_USER.email || e === DEFAULT_ADMIN.email) return true;
        return getList(KEY_USERS).concat(getList(KEY_ADMINS)).some(function (x) {
            return norm(x.email) === e;
        });
    }

    /* Purane (single) account ko list mein le aao */
    function migrateOld() {
        [
            [KEY_USER_PROFILE, KEY_USER_PASS, KEY_USERS],
            [KEY_ADMIN_PROFILE, KEY_ADMIN_PASS, KEY_ADMINS]
        ].forEach(function (s) {
            const p = readJSON(s[0], null);
            const pw = localStorage.getItem(s[1]);
            if (!p || !pw) return;

            const email = norm(p.email);
            if (email === DEFAULT_USER.email || email === DEFAULT_ADMIN.email) return;

            const list = getList(s[2]);
            const exists = list.some(function (x) { return norm(x.email) === email; });
            if (exists) return;

            list.push(Object.assign({}, p, { password: pw }));
            saveList(s[2], list);
        });
    }

    migrateOld();

    function syncToList(listKey, oldEmail, profile, newPassword) {
        const list = getList(listKey);
        const old = norm(oldEmail);

        for (let i = 0; i < list.length; i++) {
            if (norm(list[i].email) === old) {
                Object.assign(list[i], profile);
                if (newPassword) list[i].password = newPassword;
                saveList(listKey, list);
                return;
            }
        }
    }

    /* ================= ACCESS GUARD ================= */

    if (isAdminPage && localStorage.getItem("fraudGuardAdminLoggedIn") !== "true") {
        window.location.replace("login.html");
        return;
    }

    if (userPages.indexOf(pageName) !== -1 &&
        localStorage.getItem("fraudGuardLoggedIn") !== "true") {
        window.location.replace("login.html");
        return;
    }

    /* ================= PROFILE DATA ================= */

    const profileKey = isAdminPage ? KEY_ADMIN_PROFILE : KEY_USER_PROFILE;
    const passKey = isAdminPage ? KEY_ADMIN_PASS : KEY_USER_PASS;
    const listKey = isAdminPage ? KEY_ADMINS : KEY_USERS;
    const defaultProfile = isAdminPage ? DEFAULT_ADMIN : DEFAULT_USER;
    const defaultPassword = isAdminPage ? "admin123" : "123456";

    let savedProfile = readJSON(profileKey, null);
    if (!savedProfile) savedProfile = Object.assign({}, defaultProfile);

    /* ================= TRANSACTION HELPERS ================= */

    function getTxns() {
        const list = readJSON(KEY_TXNS, []);
        return Array.isArray(list) ? list : [];
    }

    function isFlagged(t) { return t.status !== "SAFE"; }

    function scoreOf(t) {
        if (typeof t.score === "number") return t.score;
        return t.risk === "High" ? 87 : t.risk === "Medium" ? 55 : 12;
    }

    function statusLabel(t) {
        if (t.status === "HIGH RISK") return "High Risk";
        if (t.status === "SUSPICIOUS") return "Suspicious";
        return "Safe";
    }

    function statusClassOf(t) {
        if (t.status === "SAFE") return "safe";
        if (t.status === "HIGH RISK") return "fraud";
        return "suspicious";
    }

    function txnIdOf(t, i) { return t.id || ("TXN" + (1001 + i)); }

    function nextTxnId() { return "TXN" + (1005 + getTxns().length); }

    /* ================= MYSQL DATABASE SYNC ================= */

    function syncWithMySQL(callback) {
        fetch("/api/fraud/transactions")
            .then(function (res) { return res.ok ? res.json() : null; })
            .then(function (mysqlTxns) {
                if (Array.isArray(mysqlTxns) && mysqlTxns.length > 0) {
                    localStorage.setItem(KEY_TXNS, JSON.stringify(mysqlTxns));
                    if (typeof callback === "function") callback(mysqlTxns);
                }
            })
            .catch(function (err) {
                console.warn("MySQL sync offline, using local storage", err);
            });
    }

    syncWithMySQL();

    /* ================= TABLE SEARCH / FILTER ================= */

    function applyRowFilter(rows, searchValue, statusValue) {
        const search = (searchValue || "").toLowerCase().trim();
        const status = (statusValue || "").toLowerCase().trim();
        const wantAll = status === "" || status.indexOf("all") === 0;

        rows.forEach(function (row) {
            const matchSearch = row.textContent.toLowerCase().indexOf(search) !== -1;
            const badge = row.querySelector(".status");
            const rowStatus = badge ? badge.textContent.toLowerCase().trim() : "";
            row.style.display = (matchSearch && (wantAll || rowStatus === status)) ? "" : "none";
        });
    }

    function wireTableFilter(searchInput, selectElement, getRows) {
        function run() {
            applyRowFilter(getRows(),
                searchInput ? searchInput.value : "",
                selectElement ? selectElement.value : "");
        }
        if (searchInput) searchInput.addEventListener("input", run);
        if (selectElement) selectElement.addEventListener("change", run);
    }

    /* ================= LOGIN TABS ================= */

    const userTab = $("userTab");
    const adminTab = $("adminTab");
    const userLogin = $("userLogin");
    const adminLogin = $("adminLogin");

    if (userTab && adminTab && userLogin && adminLogin) {

        userTab.addEventListener("click", function () {
            userTab.classList.add("active");
            adminTab.classList.remove("active");
            userLogin.classList.remove("hidden");
            adminLogin.classList.add("hidden");
        });

        adminTab.addEventListener("click", function () {
            adminTab.classList.add("active");
            userTab.classList.remove("active");
            adminLogin.classList.remove("hidden");
            userLogin.classList.add("hidden");
        });
    }

    /* ================= USER LOGIN (email ya username) ================= */

    const userLoginForm = $("userLoginForm");

    if (userLoginForm) {
        userLoginForm.addEventListener("submit", function (event) {
            event.preventDefault();

            const userEmail = $("userEmail");
            const userPassword = $("userPassword");
            const userMessage = $("userMessage");

            if (!userEmail || !userPassword || !userMessage) return;

            const loginValue = norm(userEmail.value);
            const password = userPassword.value.trim();

            if (loginValue === "" || password === "") {
                showMessage(userMessage, "Please enter email/username and password.", "red");
                return;
            }

            function loginOk(profile, pass) {
                localStorage.setItem(KEY_USER_PROFILE, JSON.stringify(profile));
                localStorage.setItem(KEY_USER_PASS, pass);
                localStorage.setItem("fraudGuardLoggedIn", "true");
                localStorage.removeItem("fraudGuardAdminLoggedIn");
                localStorage.setItem("fraudGuardUserEmail", profile.email);
                showMessage(userMessage, "Login successful!", "green");
                setTimeout(function () { window.location.href = "user-dashboard.html"; }, 500);
            }

            /* Registered users */
            const found = getList(KEY_USERS).find(function (x) {
                return norm(x.email) === loginValue || norm(x.username) === loginValue;
            });

            if (found) {
                if (found.password === password) {
                    loginOk({
                        name: found.name,
                        username: found.username,
                        email: found.email,
                        phone: found.phone || ""
                    }, found.password);
                } else {
                    showMessage(userMessage, "Wrong password.", "red");
                }
                return;
            }

            /* Default demo user */
            if ((loginValue === DEFAULT_USER.email || loginValue === "user") &&
                password === "123456") {
                loginOk(Object.assign({}, DEFAULT_USER), "123456");
                return;
            }

            /* Kya ye admin account hai? */
            const isAdminAcc = getList(KEY_ADMINS).some(function (x) {
                return norm(x.email) === loginValue || norm(x.username) === loginValue;
            });

            if (isAdminAcc) {
                showMessage(userMessage, "Account not found", "red");
                return;
            }

            showMessage(userMessage, "Account not found or invalid details. Please register first.", "red");
        });
    }

    /* ================= ADMIN LOGIN (email ya username) ================= */

    const adminLoginForm = $("adminLoginForm");

    if (adminLoginForm) {
        adminLoginForm.addEventListener("submit", function (event) {
            event.preventDefault();

            const adminEmail = $("adminEmail");
            const adminPassword = $("adminPassword");
            const adminMessage = $("adminMessage");

            if (!adminEmail || !adminPassword || !adminMessage) return;

            const loginValue = norm(adminEmail.value);
            const password = adminPassword.value.trim();

            if (loginValue === "" || password === "") {
                showMessage(adminMessage, "Please enter email/username and password.", "red");
                return;
            }

            function adminOk(profile, pass) {
                localStorage.setItem(KEY_ADMIN_PROFILE, JSON.stringify(profile));
                localStorage.setItem(KEY_ADMIN_PASS, pass);
                localStorage.setItem("fraudGuardAdminLoggedIn", "true");
                localStorage.removeItem("fraudGuardLoggedIn");
                showMessage(adminMessage, "Admin login successful!", "green");
                setTimeout(function () { window.location.href = "admin.html"; }, 500);
            }

            /* Registered admins */
            const found = getList(KEY_ADMINS).find(function (x) {
                return norm(x.email) === loginValue || norm(x.username) === loginValue;
            });

            if (found) {
                if (found.password === password) {
                    const profile = Object.assign({}, found);
                    delete profile.password;
                    adminOk(profile, found.password);
                } else {
                    showMessage(adminMessage, "Wrong admin password.", "red");
                }
                return;
            }

            /* Default admin */
            if ((loginValue === "admin" || loginValue === DEFAULT_ADMIN.email) &&
                password === "admin123") {
                adminOk(Object.assign({}, DEFAULT_ADMIN), "admin123");
                return;
            }

            /* Kya ye user account hai? */
            const isUserAcc = getList(KEY_USERS).some(function (x) {
                return norm(x.email) === loginValue || norm(x.username) === loginValue;
            });

            if (isUserAcc) {
                showMessage(adminMessage, "Account not found", "red");
                return;
            }

            showMessage(adminMessage, "Admin account not found or invalid details. Register as Admin first.", "red");
        });
    }

    /* ================= REGISTER ================= */

    const registerForm = $("registerForm");
    const registerUserTab = $("registerUserTab");
    const registerAdminTab = $("registerAdminTab");
    const registerTypeMessage = $("registerTypeMessage");
    const registerUsernameInput = $("registerUsername");
    const registerMessageBox = $("registerMessage");

    let registerType = "user";

    if (registerUserTab && registerAdminTab) {

        registerUserTab.addEventListener("click", function () {
            registerType = "user";
            registerUserTab.classList.add("active");
            registerAdminTab.classList.remove("active");
            if (registerTypeMessage) registerTypeMessage.textContent = "Create your User account";
        });

        registerAdminTab.addEventListener("click", function () {
            registerType = "admin";
            registerAdminTab.classList.add("active");
            registerUserTab.classList.remove("active");
            if (registerTypeMessage) registerTypeMessage.textContent = "Create your Admin account";
        });
    }

    /* Typing ke time username check */
    if (registerUsernameInput && registerMessageBox) {
        registerUsernameInput.addEventListener("input", function () {
            const value = registerUsernameInput.value.trim();

            if (value === "") {
                registerMessageBox.textContent = "";
                return;
            }

            if (usernameTaken(value)) {
                showMessage(registerMessageBox, "Username unavailable. Please choose another.", "red");
            } else {
                showMessage(registerMessageBox, "Username available.", "green");
            }
        });
    }

    if (registerForm) {
        registerForm.addEventListener("submit", function (event) {
            event.preventDefault();

            const registerName = $("registerName");
            const registerEmail = $("registerEmail");
            const registerPassword = $("registerPassword");
            const registerConfirm = $("confirmPassword");
            const registerMessage = $("registerMessage");

            if (!registerName || !registerEmail || !registerPassword ||
                !registerConfirm || !registerMessage) {
                alert("Register page ki IDs match nahi ho rahi.");
                return;
            }

            const name = registerName.value.trim();
            const username = registerUsernameInput && registerUsernameInput.value.trim() !== ""
                ? registerUsernameInput.value.trim().toLowerCase()
                : name.toLowerCase();
            const email = norm(registerEmail.value);
            const password = registerPassword.value.trim();
            const confirmValue = registerConfirm.value.trim();

            if (name === "" || email === "" || password === "" || confirmValue === "") {
                showMessage(registerMessage, "Please fill all fields.", "red");
                return;
            }

            /* ---- USERNAME UNIQUE CHECK ---- */
            if (usernameTaken(username)) {
                showMessage(registerMessage, "Username unavailable. Please choose another.", "red");
                return;
            }

            if (emailTaken(email)) {
                showMessage(registerMessage, "This email is already registered.", "red");
                return;
            }

            if (password.length < 6) {
                showMessage(registerMessage, "Password must contain at least 6 characters.", "red");
                return;
            }

            if (password !== confirmValue) {
                showMessage(registerMessage, "Passwords do not match.", "red");
                return;
            }

            if (registerType === "user") {

                const users = getList(KEY_USERS);

                users.push({
                    name: name,
                    username: username,
                    email: email,
                    phone: "",
                    password: password
                });

                saveList(KEY_USERS, users);

                showMessage(registerMessage, "User registration successful! Redirecting to login...", "green");

            } else {

                const admins = getList(KEY_ADMINS);
                const number = String(admins.length + 2).padStart(3, "0");

                admins.push({
                    name: name,
                    username: username,
                    email: email,
                    phone: "",
                    adminId: "FG-ADM-" + number,
                    role: "System Administrator",
                    department: "Fraud Detection & Security",
                    accessLevel: "Full Access",
                    password: password
                });

                saveList(KEY_ADMINS, admins);

                showMessage(registerMessage, "Admin registration successful! Redirecting to login...", "green");
            }

            setTimeout(function () { window.location.href = "login.html"; }, 1000);
        });
    }

    /* ================= TRANSACTION FRAUD CHECK ================= */

    const transactionForm = $("transactionForm");

    if (transactionForm) {

        const idField = $("transactionId");

        if (idField && getTxns().length > 0) idField.value = nextTxnId();

        transactionForm.addEventListener("submit", function (event) {
            event.preventDefault();

            const amountInput = $("amount");
            const typeInput = $("transactionType");
            const locationInput = $("location");
            const recipientInput = $("recipient");
            const messageBox = $("transactionMessage");

            const resultCard = $("resultCard");
            const resultIcon = $("resultIcon");
            const resultStatus = $("resultStatus");
            const resultDescription = $("resultDescription");
            const resultTransactionId = $("resultTransactionId");
            const resultAmount = $("resultAmount");
            const resultType = $("resultType");
            const resultLocation = $("resultLocation");
            const resultRecipient = $("resultRecipient");
            const riskLevel = $("riskLevel");
            const aiRiskScore = $("aiRiskScore");
            const aiRiskProgress = $("aiRiskProgress");
            const aiExplanation = $("aiExplanation");
            const detectionType = $("detectionType");

            if (!amountInput || !typeInput || !locationInput || !resultCard) return;

            if (messageBox) messageBox.textContent = "";

            const txnId = idField ? idField.value.trim() : "TXN0000";
            const amount = parseFloat(amountInput.value);
            const type = typeInput.value;
            const locationText = locationInput.value.trim();
            const locationKey = locationText.toLowerCase();
            const recipient = recipientInput ? recipientInput.value.trim() : "";

            if (isNaN(amount) || amount <= 0) {
                if (messageBox) messageBox.textContent = "Please enter a valid amount.";
                return;
            }

            let score = 10;
            const reasons = [];

            if (amount >= 40000) {
                score += 60;
                reasons.push("High transaction amount");
            } else if (amount >= 15000) {
                score += 25;
                reasons.push("Above-average transaction amount");
            }

            if (locationKey === "unknown" || locationKey === "") {
                score += 30;
                reasons.push("Unknown location");
            }

            if (type === "Transfer" && amount >= 15000) {
                score += 20;
                reasons.push("Unusual large transfer");
            }

            if (type === "Withdrawal" && amount >= 20000) {
                score += 15;
                reasons.push("Large cash withdrawal");
            }

            if (score > 99) score = 99;

            let status = "SAFE";
            let risk = "Low";
            let icon = "🛡️";
            let statusClass = "safe";
            let description = "This transaction appears to be normal.";
            let explanation = "No unusual pattern was found. Amount, type and location are within normal limits.";

            if (score >= 70) {
                status = "HIGH RISK";
                risk = "High";
                icon = "🚨";
                statusClass = "high-risk";
                description = "This transaction looks highly risky and should be blocked or verified.";
                explanation = "FraudGuard AI found strong fraud indicators: " +
                    reasons.join(", ").toLowerCase() +
                    ". Please verify this transaction immediately.";
            } else if (score >= 40) {
                status = "SUSPICIOUS";
                risk = "Medium";
                icon = "⚠️";
                statusClass = "suspicious";
                description = "This transaction looks unusual and needs a review.";
                explanation = "FraudGuard AI flagged this transaction because of: " +
                    reasons.join(", ").toLowerCase() +
                    ". Please review before approving.";
            }

            const detection = reasons.length > 0 ? reasons.join(", ") : "Normal Activity";

            const owner = readJSON(KEY_USER_PROFILE, null);
            const transactions = getTxns();

            function renderResult(data) {
                resultCard.classList.remove("hidden");

                if (resultIcon) resultIcon.textContent = data.icon || "🛡️";

                if (resultStatus) {
                    resultStatus.textContent = data.status;
                    resultStatus.className = "result-status " + (data.statusClass || "safe");
                }

                if (resultDescription) resultDescription.textContent = data.description;
                if (resultTransactionId) resultTransactionId.textContent = data.transactionId || txnId;
                if (resultAmount) resultAmount.textContent = Number(data.amount).toLocaleString("en-IN");
                if (resultType) resultType.textContent = data.type || type;
                if (resultLocation) resultLocation.textContent = data.location || locationText;
                if (resultRecipient) resultRecipient.textContent = data.recipient || recipient;
                if (riskLevel) riskLevel.textContent = data.risk;
                if (aiRiskScore) aiRiskScore.textContent = data.score + " / 100";
                if (aiExplanation) aiExplanation.textContent = data.explanation;
                if (detectionType) detectionType.textContent = data.detection;

                if (aiRiskProgress) {
                    aiRiskProgress.style.width = "0%";
                    setTimeout(function () { aiRiskProgress.style.width = data.score + "%"; }, 50);
                }

                resultCard.scrollIntoView({ behavior: "smooth", block: "start" });

                transactions.push({
                    id: data.transactionId || txnId,
                    user: (owner && owner.name) ? owner.name : "User",
                    amount: data.amount != null ? data.amount : amount,
                    type: data.type || type,
                    location: data.location || locationText,
                    recipient: data.recipient || recipient,
                    status: data.status,
                    risk: data.risk,
                    score: data.score,
                    reason: data.detection,
                    date: new Date().toLocaleString()
                });

                localStorage.setItem(KEY_TXNS, JSON.stringify(transactions));

                if (idField) idField.value = nextTxnId();
            }

            // Call Spring Boot Backend API
            fetch("http://localhost:8080/api/fraud/check", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    transactionId: txnId,
                    amount: amount,
                    transactionType: type,
                    location: locationText,
                    recipient: recipient
                })
            })
            .then(function(res) {
                if (!res.ok) throw new Error("HTTP " + res.status);
                return res.json();
            })
            .then(function(backendData) {
                renderResult(backendData);
            })
            .catch(function(err) {
                console.warn("Backend API unavailable, using fallback:", err);
                renderResult({
                    icon: icon,
                    status: status,
                    statusClass: statusClass,
                    description: description,
                    transactionId: txnId,
                    amount: amount,
                    type: type,
                    location: locationText,
                    recipient: recipient,
                    risk: risk,
                    score: score,
                    explanation: explanation,
                    detection: detection
                });
            });
        });
    }

    /* ================= SIDEBAR / HAMBURGER ================= */

    function setupSidebar() {

        const sidebar = document.querySelector(".sidebar");
        if (!sidebar) return;

        if (!sidebar.id) sidebar.id = "sidebar";

        const header = document.querySelector("header");

        let menuButton = $("menuButton");
        if (!menuButton && header) {
            menuButton = document.createElement("button");
            menuButton.id = "menuButton";
            menuButton.type = "button";
            menuButton.className = "menu-toggle";
            menuButton.setAttribute("aria-label", "Menu");
            menuButton.innerHTML = "<span></span><span></span><span></span>";
            header.insertBefore(menuButton, header.firstChild);
        }

        let overlay = $("sidebarOverlay");
        if (!overlay) {
            overlay = document.createElement("div");
            overlay.id = "sidebarOverlay";
            overlay.className = "sidebar-overlay";
            sidebar.parentNode.insertBefore(overlay, sidebar);
        }

        let closeButton = $("closeSidebar");
        if (!closeButton) {
            let head = sidebar.querySelector(".sidebar-header");
            if (!head) {
                head = document.createElement("div");
                head.className = "sidebar-header";
                const title = sidebar.querySelector("h3");
                sidebar.insertBefore(head, sidebar.firstChild);
                if (title) head.appendChild(title);
            }
            closeButton = document.createElement("button");
            closeButton.id = "closeSidebar";
            closeButton.type = "button";
            closeButton.className = "sidebar-close";
            closeButton.textContent = "✕";
            head.appendChild(closeButton);
        }

        if (!sidebar.querySelector(".sidebar-logout")) {
            const logout = document.createElement("button");
            logout.type = "button";
            logout.className = "sidebar-logout";
            logout.textContent = "🚪 Logout";
            logout.style.cssText =
                "margin-top:auto;width:100%;padding:13px 15px;border:none;" +
                "border-radius:9px;background:#fef2f2;color:#dc2626;" +
                "font-size:14px;font-weight:600;text-align:left;cursor:pointer;";
            logout.addEventListener("click", function () {
                clearLogin();
                window.location.href = "login.html";
            });
            sidebar.appendChild(logout);
        }

        function openSidebar() {
            sidebar.classList.add("active");
            overlay.classList.add("active");
            if (menuButton) menuButton.classList.add("active");
        }

        function closeSidebarMenu() {
            sidebar.classList.remove("active");
            overlay.classList.remove("active");
            if (menuButton) menuButton.classList.remove("active");
        }

        if (menuButton) {
            menuButton.addEventListener("click", function () {
                if (sidebar.classList.contains("active")) closeSidebarMenu();
                else openSidebar();
            });
        }

        closeButton.addEventListener("click", closeSidebarMenu);
        overlay.addEventListener("click", closeSidebarMenu);

        document.addEventListener("keydown", function (event) {
            if (event.key === "Escape") closeSidebarMenu();
        });
    }

    setupSidebar();

    /* ================= ADMIN PAGES: header links ================= */

    if (isAdminPage) {
        document.querySelectorAll('header nav a[href="user-dashboard.html"]')
            .forEach(function (l) { l.setAttribute("href", "admin.html"); });

        document.querySelectorAll("header .profile-link")
            .forEach(function (l) { l.setAttribute("href", "admin-profile.html"); });
    }

    /* ================= FRAUDBOT ================= */

    const botMessage = document.querySelector(".fraudbot-message");

    document.querySelectorAll(".fraudbot-button").forEach(function (button) {
        button.addEventListener("click", function () {
            if (botMessage) {
                botMessage.style.display = botMessage.style.display === "none" ? "" : "none";
            }
        });
    });

    document.querySelectorAll(".fraudbot-close").forEach(function (button) {
        button.addEventListener("click", function () {
            if (botMessage) botMessage.style.display = "none";
        });
    });

    /* ================= USER DASHBOARD ================= */

    if (pageName === "user-dashboard") {

        const welcomeName = $("welcomeName");
        if (welcomeName) welcomeName.textContent = savedProfile.name || "User";

        const txns = getTxns();
        const flaggedList = txns.filter(isFlagged);
        const highCount = txns.filter(function (t) { return t.status === "HIGH RISK"; }).length;

        if ($("totalTxn")) $("totalTxn").textContent = txns.length;
        if ($("suspiciousTxn")) $("suspiciousTxn").textContent = flaggedList.length;
        if ($("alertCount")) $("alertCount").textContent = flaggedList.length;

        const body = $("recentTxnBody");

        if (body) {
            body.innerHTML = "";

            if (txns.length === 0) {
                body.innerHTML =
                    '<tr><td colspan="6">No transactions yet. Go to Transaction Details to check one.</td></tr>';
            } else {
                const start = Math.max(0, txns.length - 5);

                for (let i = txns.length - 1; i >= start; i--) {
                    const t = txns[i];
                    const score = scoreOf(t);
                    const tr = document.createElement("tr");

                    tr.innerHTML =
                        "<td>" + escapeHtml(txnIdOf(t, i)) + "</td>" +
                        "<td>" + money(t.amount) + "</td>" +
                        "<td>" + escapeHtml(t.type) + "</td>" +
                        "<td>" + escapeHtml(t.date) + "</td>" +
                        '<td><span class="risk ' + (score >= 40 ? "high" : "low") + '">' +
                        score + "/100</span></td>" +
                        '<td><span class="status ' + statusClassOf(t) + '">' +
                        statusLabel(t) + "</span></td>";

                    body.appendChild(tr);
                }
            }
        }

        if (txns.length > 0) {

            const securityScore = Math.max(
                10, 100 - (flaggedList.length - highCount) * 8 - highCount * 15);

            const scoreBox = document.querySelector(".security-score strong");
            const scoreBar = document.querySelector(".score-progress");
            const scoreText = document.querySelector(".security-info p");

            if (scoreBox) scoreBox.innerHTML = securityScore + "<span>/100</span>";
            if (scoreBar) scoreBar.style.width = securityScore + "%";

            if (scoreText) {
                scoreText.textContent = flaggedList.length === 0
                    ? "Your account activity looks normal."
                    : flaggedList.length + " transaction(s) need your attention.";
            }

            const activityCard = document.querySelector(".activity-card");

            if (activityCard) {
                activityCard.querySelectorAll(".activity-item")
                    .forEach(function (item) { item.remove(); });

                const startA = Math.max(0, txns.length - 3);

                for (let i = txns.length - 1; i >= startA; i--) {
                    const t = txns[i];
                    const safe = t.status === "SAFE";

                    const title = safe ? "Transaction Verified"
                        : (t.status === "HIGH RISK" ? "High-Risk Transaction" : "Suspicious Transaction");

                    const item = document.createElement("div");
                    item.className = "activity-item";

                    item.innerHTML =
                        '<span class="activity-icon ' + (safe ? "safe-icon" : "warning-icon") + '">' +
                        (safe ? "✓" : "!") + "</span>" +
                        "<div><strong>" + title + "</strong><p>" +
                        escapeHtml(txnIdOf(t, i)) +
                        (safe ? " was successfully processed." : " was flagged for review.") +
                        "</p></div>";

                    activityCard.appendChild(item);
                }
            }

            const analysisCard = document.querySelector(".analysis-card");

            if (analysisCard) {
                const latest = flaggedList.length > 0
                    ? flaggedList[flaggedList.length - 1] : txns[txns.length - 1];

                const latestIndex = txns.lastIndexOf(latest);
                const latestSafe = latest.status === "SAFE";

                const aId = analysisCard.querySelector(".analysis-id strong");
                const aScore = analysisCard.querySelector(".analysis-score strong");
                const aStatus = analysisCard.querySelector(".analysis-status");
                const aList = analysisCard.querySelector("ul");
                const aNote = analysisCard.querySelector(".analysis-note");

                if (aId) aId.textContent = txnIdOf(latest, latestIndex);
                if (aScore) aScore.textContent = scoreOf(latest) + "/100";

                if (aStatus) {
                    aStatus.textContent = latestSafe
                        ? "✓ Safe Transaction"
                        : "⚠ " + statusLabel(latest) + " Transaction";
                }

                if (aList) {
                    aList.innerHTML = "";
                    String(latest.reason || "Normal Activity").split(", ").forEach(function (reason) {
                        const li = document.createElement("li");
                        li.textContent = reason;
                        aList.appendChild(li);
                    });
                }

                if (aNote) {
                    aNote.textContent = latestSafe
                        ? "No action needed for this transaction."
                        : "Please review this transaction carefully.";
                }
            }

            const botText = document.querySelector(".fraudbot-message p");

            if (botText) {
                botText.innerHTML =
                    "Your account looks " +
                    (flaggedList.length === 0 ? "secure." : "worth a review.") +
                    "<br>" + flaggedList.length + " alert(s) need your attention.";
            }
        }
    }

    /* ================= TRANSACTION HISTORY ================= */

    if (pageName === "history") {

        const historyBody = document.querySelector(".history-table tbody");

        if (historyBody) {

        function renderHistory(txns) {
            txns = txns || getTxns();
            if (txns.length > 0) {
                historyBody.innerHTML = "";

                let safeCount = 0;
                let scoreSum = 0;
                let topIndex = 0;

                for (let i = txns.length - 1; i >= 0; i--) {
                    const t = txns[i];
                    const score = scoreOf(t);

                    scoreSum += score;
                    if (t.status === "SAFE") safeCount++;
                    if (score > scoreOf(txns[topIndex])) topIndex = i;

                    const riskClass = score < 40 ? "low" : (score < 70 ? "high" : "critical");

                    const tr = document.createElement("tr");

                    tr.innerHTML =
                        "<td><strong>" + escapeHtml(txnIdOf(t, i)) + "</strong></td>" +
                        "<td>" + money(t.amount) + "</td>" +
                        "<td>" + escapeHtml(t.type) + "</td>" +
                        "<td>" + escapeHtml(t.location || "-") + "</td>" +
                        "<td>" + escapeHtml(t.date) + "</td>" +
                        '<td><span class="history-risk ' + riskClass + '">' +
                        score + "/100</span></td>" +
                        '<td><span class="status ' + statusClassOf(t) + '">' +
                        statusLabel(t) + "</span></td>";

                    historyBody.appendChild(tr);
                }

                const flaggedCount = txns.length - safeCount;
                const cards = document.querySelectorAll(".history-summary-card strong");

                if (cards.length >= 4) {
                    cards[0].textContent = txns.length;
                    cards[1].textContent = safeCount;
                    cards[2].textContent = flaggedCount;
                    cards[3].textContent = Math.round(scoreSum / txns.length) + "/100";
                }
            }
        }

        renderHistory();
        syncWithMySQL(renderHistory);

                const insight = document.querySelector(".history-insight p");

                if (insight) {
                    const top = txns[topIndex];
                    insight.textContent =
                        txnIdOf(top, topIndex) + " has the highest risk score (" +
                        scoreOf(top) + "/100) in your recent history. Main reason: " +
                        String(top.reason || "Normal Activity").toLowerCase() + ".";
                }

                const botText = document.querySelector(".fraudbot-message p");

                if (botText) {
                    botText.textContent =
                        "I found " + flaggedCount +
                        " transaction(s) that may require your attention.";
                }
            }

            wireTableFilter(
                document.querySelector(".history-search input"),
                document.querySelector(".history-controls select"),
                function () {
                    return Array.from(document.querySelectorAll(".history-table tbody tr"));
                }
            );
        }
    }

    /* ================= USER ALERTS ================= */

    if (pageName === "alerts") {

        const alertList = document.querySelector(".alert-list");
        const txns = getTxns();

        if (alertList && txns.length > 0) {

            alertList.innerHTML = "";
            let shown = 0;

            for (let i = txns.length - 1; i >= 0; i--) {
                const t = txns[i];
                if (!isFlagged(t)) continue;

                shown++;

                const high = t.status === "HIGH RISK";
                const card = document.createElement("div");
                card.className = "alert-card" + (high ? " high-risk" : "");

                card.innerHTML =
                    '<div class="alert-icon">' + (high ? "🚨" : "⚠️") + "</div>" +
                    '<div class="alert-content">' +
                    "<h2>" + (high ? "High Risk Transaction" : "Suspicious Transaction Detected") + "</h2>" +
                    "<p>Transaction " + escapeHtml(txnIdOf(t, i)) + " for " +
                    money(t.amount) + " was flagged: " +
                    escapeHtml(String(t.reason || "unusual activity").toLowerCase()) + ".</p>" +
                    "<span>" + escapeHtml(t.date) + "</span>" +
                    "</div>";

                alertList.appendChild(card);
            }

            if (shown === 0) {
                alertList.innerHTML =
                    '<div class="alert-card" style="border-left-color:#22c55e;">' +
                    '<div class="alert-icon">✅</div>' +
                    '<div class="alert-content">' +
                    "<h2>No suspicious activity</h2>" +
                    "<p>All your transactions look safe.</p>" +
                    "<span>Everything is fine</span>" +
                    "</div></div>";
            }
        }
    }

    /* ================= ADMIN: DASHBOARD ================= */

    if (pageName === "admin") {

        const adminBody = document.querySelector(".recent-section tbody");
        const txns = getTxns();

        if (adminBody && txns.length > 0) {

            const startR = Math.max(0, txns.length - 3);

            for (let i = startR; i < txns.length; i++) {
                const t = txns[i];
                const score = scoreOf(t);
                const riskClass = score < 40 ? "low" : (score < 80 ? "high" : "critical");

                const tr = document.createElement("tr");

                tr.innerHTML =
                    "<td>" + escapeHtml(txnIdOf(t, i)) + "</td>" +
                    "<td>" + escapeHtml(t.user || "User") + "</td>" +
                    "<td>" + money(t.amount) + "</td>" +
                    "<td>" + escapeHtml(t.type) + "</td>" +
                    '<td><span class="admin-risk ' + riskClass + '">' + score + "/100</span></td>" +
                    '<td><span class="status ' + statusClassOf(t) + '">' +
                    statusLabel(t) + "</span></td>";

                adminBody.insertBefore(tr, adminBody.firstChild);
            }
        }
    }

    /* ================= ADMIN: TRANSACTIONS ================= */

    if (pageName === "admin-transactions") {

        const monitorBody = document.querySelector(".recent-section tbody");
        const txns = getTxns();

        if (monitorBody) {

            for (let i = 0; i < txns.length; i++) {
                const t = txns[i];
                const score = scoreOf(t);

                const riskClass =
                    score < 40 ? "low" : (score < 60 ? "medium" : (score < 80 ? "high" : "critical"));

                const tr = document.createElement("tr");

                tr.innerHTML =
                    "<td>" + escapeHtml(txnIdOf(t, i)) + "</td>" +
                    "<td>" + escapeHtml(t.user || "User") + "</td>" +
                    "<td>" + money(t.amount) + "</td>" +
                    "<td>" + escapeHtml(t.type) + "</td>" +
                    "<td>" + escapeHtml(t.location || "-") + "</td>" +
                    '<td><span class="transaction-risk ' + riskClass + '">' +
                    score + "/100</span></td>" +
                    '<td><span class="status ' + statusClassOf(t) + '">' +
                    statusLabel(t) + "</span></td>";

                monitorBody.insertBefore(tr, monitorBody.firstChild);
            }

            wireTableFilter(
                document.querySelector(".transaction-filter input"),
                document.querySelector(".transaction-filter select"),
                function () {
                    return Array.from(document.querySelectorAll(".recent-section tbody tr"));
                }
            );
        }
    }

    /* ================= ADMIN: ALERTS ================= */

    if (pageName === "admin-alerts") {

        const adminAlertList = document.querySelector(".alert-list");
        const txns = getTxns();

        if (adminAlertList) {

            for (let i = 0; i < txns.length; i++) {
                const t = txns[i];
                if (!isFlagged(t)) continue;

                const high = t.status === "HIGH RISK";
                const card = document.createElement("div");
                card.className = "alert-card" + (high ? " high-risk" : "");

                card.innerHTML =
                    '<div class="alert-icon">' + (high ? "🚨" : "⚠️") + "</div>" +
                    '<div class="alert-content">' +
                    "<h2>" + (high ? "High Risk Transaction" : "Suspicious Transaction") + "</h2>" +
                    "<p>Transaction " + escapeHtml(txnIdOf(t, i)) + " from " +
                    escapeHtml(t.user || "User") + " involves " + money(t.amount) +
                    ". Reason: " +
                    escapeHtml(String(t.reason || "unusual activity").toLowerCase()) + ".</p>" +
                    "<span>" + escapeHtml(t.date) + " • " +
                    (high ? "High Risk" : "Medium Risk") + "</span>" +
                    "</div>";

                adminAlertList.insertBefore(card, adminAlertList.firstChild);
            }
        }
    }

    /* ================= ADMIN: USERS (sab registered users) ================= */

    if (pageName === "admin-users") {

        const usersBody = document.querySelector(".recent-section tbody");
        const users = getList(KEY_USERS);

        if (usersBody && users.length > 0) {

            const txns = getTxns();

            users.forEach(function (u, index) {

                const userTxns = txns.filter(function (t) {
                    return norm(t.user) === norm(u.name);
                });

                const flaggedCount = userTxns.filter(isFlagged).length;

                const tr = document.createElement("tr");

                tr.innerHTML =
                    "<td>USR" + (100 + index) + "</td>" +
                    "<td>" + escapeHtml(u.name || "User") + "</td>" +
                    "<td>" + escapeHtml(u.email || "") + "</td>" +
                    '<td><span class="status ' + (flaggedCount > 0 ? "suspicious" : "safe") + '">' +
                    (flaggedCount > 0 ? "Under Review" : "Active") + "</span></td>" +
                    "<td>" + userTxns.length + "</td>" +
                    '<td><span class="user-risk ' + (flaggedCount > 0 ? "high" : "low") + '">' +
                    (flaggedCount > 0 ? "HIGH" : "LOW") + "</span></td>";

                usersBody.insertBefore(tr, usersBody.firstChild);
            });
        }
    }

    /* ================= DISPLAY PROFILE ================= */

    function setText(id, value) {
        const el = $(id);
        if (el) el.textContent = value;
    }

    function renderProfile() {
        setText("profileName", savedProfile.name || defaultProfile.name);
        setText("profileEmail", savedProfile.email || defaultProfile.email);
        setText("profilePhone", savedProfile.phone || defaultProfile.phone);
        setText("profileUsername", savedProfile.username || defaultProfile.username);

        if (isAdminPage) {
            setText("adminId", savedProfile.adminId || DEFAULT_ADMIN.adminId);
            setText("adminRole", savedProfile.role || DEFAULT_ADMIN.role);
            setText("adminDepartment", savedProfile.department || DEFAULT_ADMIN.department);
            setText("adminAccess", savedProfile.accessLevel || DEFAULT_ADMIN.accessLevel);
        }
    }

    renderProfile();

    /* ================= EDIT PROFILE ================= */

    function fieldHtml(label, id, value, type) {
        return '<div class="profile-info"><label>' + label + '</label>' +
            '<input type="' + (type || "text") + '" id="' + id + '" value="' +
            escapeHtml(value) + '"></div>';
    }

    const editProfileBtn = $("editProfileBtn");

    if (editProfileBtn) {

        editProfileBtn.addEventListener("click", function () {

            const profileCard = document.querySelector(".profile-card");
            if (!profileCard || $("inlineEditProfile")) return;

            const buttons = profileCard.querySelector(".profile-buttons");
            const editForm = document.createElement("div");
            editForm.id = "inlineEditProfile";

            const buttonsHtml =
                '<div class="profile-buttons">' +
                '<button type="button" class="edit-btn" id="saveEditBtn">Save Changes</button>' +
                '<button type="button" class="change-password-btn" id="cancelEditBtn">Cancel</button>' +
                "</div>";

            if (isAdminPage) {
                editForm.innerHTML =
                    fieldHtml("Name", "editAdminName", savedProfile.name || DEFAULT_ADMIN.name) +
                    fieldHtml("Email", "editAdminEmail", savedProfile.email || DEFAULT_ADMIN.email, "email") +
                    fieldHtml("Admin ID", "editAdminId", savedProfile.adminId || DEFAULT_ADMIN.adminId) +
                    fieldHtml("Role", "editAdminRole", savedProfile.role || DEFAULT_ADMIN.role) +
                    fieldHtml("Department", "editAdminDepartment", savedProfile.department || DEFAULT_ADMIN.department) +
                    fieldHtml("Access Level", "editAdminAccess", savedProfile.accessLevel || DEFAULT_ADMIN.accessLevel) +
                    buttonsHtml;
            } else {
                editForm.innerHTML =
                    fieldHtml("Name", "editName", savedProfile.name || "") +
                    fieldHtml("Email", "editEmail", savedProfile.email || "", "email") +
                    fieldHtml("Phone", "editPhone", savedProfile.phone || "") +
                    buttonsHtml;
            }

            if (buttons) {
                buttons.style.display = "none";
                profileCard.insertBefore(editForm, buttons);
            } else {
                profileCard.appendChild(editForm);
            }

            function closeForm() {
                editForm.remove();
                if (buttons) buttons.style.display = "";
            }

            $("cancelEditBtn").addEventListener("click", closeForm);

            $("saveEditBtn").addEventListener("click", function () {

                const oldEmail = savedProfile.email;

                if (isAdminPage) {
                    const n = $("editAdminName").value.trim();
                    const e = norm($("editAdminEmail").value);
                    const id = $("editAdminId").value.trim();
                    const r = $("editAdminRole").value.trim();
                    const d = $("editAdminDepartment").value.trim();
                    const a = $("editAdminAccess").value.trim();

                    if (!n || !e || !id || !r || !d || !a) {
                        alert("All fields are required.");
                        return;
                    }

                    if (e !== norm(oldEmail) && emailTaken(e)) {
                        alert("This email is already registered.");
                        return;
                    }

                    savedProfile.name = n;
                    savedProfile.email = e;
                    savedProfile.adminId = id;
                    savedProfile.role = r;
                    savedProfile.department = d;
                    savedProfile.accessLevel = a;

                    localStorage.setItem(KEY_ADMIN_PROFILE, JSON.stringify(savedProfile));
                    syncToList(KEY_ADMINS, oldEmail, savedProfile);

                    renderProfile();
                    closeForm();
                    alert("Admin profile updated successfully.");
                    return;
                }

                const newName = $("editName").value.trim();
                const newEmail = norm($("editEmail").value);
                const newPhone = $("editPhone").value.trim();

                if (newName === "") { alert("Name cannot be empty."); return; }
                if (newEmail === "") { alert("Email cannot be empty."); return; }

                if (newEmail !== norm(oldEmail) && emailTaken(newEmail)) {
                    alert("This email is already registered.");
                    return;
                }

                savedProfile.name = newName;
                savedProfile.email = newEmail;
                savedProfile.phone = newPhone;

                localStorage.setItem(KEY_USER_PROFILE, JSON.stringify(savedProfile));
                localStorage.setItem("fraudGuardUserEmail", savedProfile.email);
                syncToList(KEY_USERS, oldEmail, savedProfile);

                renderProfile();
                closeForm();
                alert("Profile updated successfully.");
            });
        });
    }

    /* ================= CHANGE PASSWORD ================= */

    const changePasswordBtn = $("changePasswordBtn");
    const passwordModal = $("passwordModal");
    const closePassword = $("closePassword");
    const savePasswordBtn = $("savePasswordBtn");

    if (changePasswordBtn && passwordModal) {
        changePasswordBtn.addEventListener("click", function () {
            passwordModal.classList.add("active");
        });
    }

    if (closePassword && passwordModal) {
        closePassword.addEventListener("click", function () {
            passwordModal.classList.remove("active");
        });
    }

    if (passwordModal) {
        passwordModal.addEventListener("click", function (event) {
            if (event.target === passwordModal) passwordModal.classList.remove("active");
        });
    }

    if (savePasswordBtn) {
        savePasswordBtn.addEventListener("click", function () {

            const currentPassword = $("currentPassword");
            const newPassword = $("newPassword");
            const confirmNewPassword = $("confirmPassword");

            if (!currentPassword || !newPassword || !confirmNewPassword) return;

            const current = currentPassword.value.trim();
            const newPass = newPassword.value.trim();
            const confirmValue = confirmNewPassword.value.trim();

            const oldPassword = localStorage.getItem(passKey) || defaultPassword;

            if (current === "") { alert("Please enter current password."); return; }
            if (current !== oldPassword) { alert("Current password is incorrect."); return; }
            if (newPass.length < 6) { alert("New password must contain at least 6 characters."); return; }
            if (newPass !== confirmValue) { alert("New passwords do not match."); return; }

            localStorage.setItem(passKey, newPass);
            syncToList(listKey, savedProfile.email, {}, newPass);

            alert("Password changed successfully.");

            currentPassword.value = "";
            newPassword.value = "";
            confirmNewPassword.value = "";

            passwordModal.classList.remove("active");
        });
    }

    /* ================= PROFILE DROPDOWN ================= */

    function closeProfileDropdown() {
        const old = document.querySelector(".profile-dropdown.js-dropdown");
        if (old) old.remove();
    }

    function openProfileDropdown(trigger) {

        const profilePage = isAdminPage ? "admin-profile.html" : "profile.html";
        const dashboardPage = isAdminPage ? "admin.html" : "user-dashboard.html";
        const secondPage = isAdminPage ? "admin-transactions.html" : "alerts.html";
        const secondText = isAdminPage ? "💳 Transactions" : "🚨 Security Alerts";

        const name = savedProfile.name || defaultProfile.name;
        const email = savedProfile.email || defaultProfile.email;

        const dropdown = document.createElement("div");
        dropdown.className = "profile-dropdown js-dropdown active";

        dropdown.innerHTML =
            '<div class="profile-dropdown-header">' +
            '<div class="dropdown-profile-icon">👤</div>' +
            "<div><strong>" + escapeHtml(name) + "</strong>" +
            "<span>" + escapeHtml(email) + "</span></div>" +
            "</div>" +
            '<div class="profile-status">● SESSION ACTIVE</div>' +
            '<a href="' + profilePage + '">👤 My Profile</a>' +
            '<a href="' + dashboardPage + '">🏠 Dashboard</a>' +
            '<a href="' + secondPage + '">' + secondText + "</a>" +
            '<button type="button" class="dropdown-logout">🚪 Logout</button>';

        document.body.appendChild(dropdown);

        const rect = trigger.getBoundingClientRect();

        dropdown.style.position = "fixed";
        dropdown.style.top = (rect.bottom + 10) + "px";
        dropdown.style.right = "20px";
        dropdown.style.left = "auto";
        dropdown.style.zIndex = "100000";

        const logoutButton = dropdown.querySelector(".dropdown-logout");

        if (logoutButton) {
            logoutButton.addEventListener("click", function () {
                clearLogin();
                window.location.href = "login.html";
            });
        }
    }

    document.querySelectorAll(".profile-link, #profileBtn").forEach(function (trigger) {
        trigger.addEventListener("click", function (event) {
            event.preventDefault();
            event.stopPropagation();

            if (document.querySelector(".profile-dropdown.js-dropdown")) {
                closeProfileDropdown();
                return;
            }

            openProfileDropdown(trigger);
        });
    });

    document.addEventListener("click", function (event) {
        if (!document.querySelector(".profile-dropdown.js-dropdown")) return;
        if (!event.target.closest(".profile-dropdown")) closeProfileDropdown();
    });

    document.addEventListener("keydown", function (event) {
        if (event.key === "Escape") closeProfileDropdown();
    });

    /* ================= LOGOUT BUTTONS ================= */

    document.querySelectorAll(".logout-btn").forEach(function (button) {
        button.addEventListener("click", function () {
            clearLogin();
            window.location.href = "login.html";
        });
    });

});
