# 💻 FraudGuard Web UI (Frontend)

The frontend client application for the **AI-Powered Fraud Detection System**, providing responsive user dashboards, real-time transaction scanners, and administrative management tools.

---

## 🎨 Features & Interface Walkthrough

* **Landing Experience (`index.html`)**: Overview of FraudGuard AI capabilities, security guarantees, and quick access to portals.
* **Authentication (`login.html` & `register.html`)**: Dual user/admin login portal with password validation and instant registration.
* **Transaction Scanner (`transaction.html`)**: Input form for testing payments against the AI engine. Features a real-time risk gauge, status badge, and detailed decision breakdown.
* **Transaction History (`history.html`)**: Sortable, filterable audit log of historical transactions with safe, suspicious, and blocked markers.
* **Alert Notifications (`alerts.html`)**: Real-time push notification log alerting account holders of flagged payment activity.
* **Admin Executive Portal (`admin.html`)**: High-level KPI metrics, real-time fraud trends, and status counters.
* **Admin Transactions View (`admin-transactions.html`)**: Bank-wide ledger of all processed transactions with search & filter.
* **Admin Alert Review (`admin-alerts.html`)**: Queue of suspicious/blocked cases with review action triggers.
* **Admin User Registry (`admin-users.html`)**: User management table allowing role elevation (`USER` &rarr; `ADMIN`).
* **Admin Risk Reports (`admin-reports.html`)**: Fraud prevention analytics and loss prevention breakdown.

---

## 🚀 Running the Frontend

### Standalone Local Preview
You can open any `.html` file directly in a modern web browser, or serve it using Python's built-in HTTP server:
```bash
python -m http.server 5500
```
Then visit `http://localhost:5500/index.html`.

### Integrated Full-Stack Mode
When running the Spring Boot backend (`http://localhost:8080`), these files are served automatically by Tomcat from `fraud-detection/src/main/resources/static/`.

### Offline Resilient Simulation
If the backend server is temporarily offline, `script.js` seamlessly switches to a client-side heuristic engine and preserves all transactions in browser `localStorage`.
