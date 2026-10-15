# 📡 FraudGuard REST API Reference

The FraudGuard AI backend provides a comprehensive RESTful API built on Spring Boot 4.1 with Spring Security & JWT.

**Base URL:** `http://localhost:8080` (or your deployed server domain)

---

## 1. Authentication & User Management

### 1.1 User Login
* **Endpoint:** `POST /api/fraud/login` or `POST /api/auth/login`
* **Access:** Public
* **Request Headers:** `Content-Type: application/json`
* **Request Body:**
```json
{
  "email": "admin@frauddetection.com",
  "password": "admin123"
}
```
* **Success Response (`200 OK`):**
```json
{
  "name": "Admin",
  "email": "admin@frauddetection.com",
  "role": "ADMIN",
  "token": "eyJhbGciOiJIUzI1NiJ9..."
}
```

### 1.2 User Registration
* **Endpoint:** `POST /api/fraud/register` or `POST /api/auth/register`
* **Access:** Public
* **Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "role": "USER"
}
```
* **Success Response (`200 OK`):**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "role": "USER",
  "message": "User successfully registered in MySQL database!"
}
```

---

## 2. Fraud Detection Endpoints

### 2.1 Evaluate Transaction
Analyzes payment attributes in real time, applies anomaly scoring heuristics, persists the transaction in MySQL, and queues high-risk cases for investigation.

* **Endpoint:** `POST /api/fraud/check`
* **Access:** Public / Authenticated
* **Request Body:**
```json
{
  "transactionId": "TXN1005",
  "amount": 75000.00,
  "transactionType": "Transfer",
  "location": "Mumbai",
  "recipient": "Merchant XYZ"
}
```
* **Success Response (`200 OK` - High Risk Sample):**
```json
{
  "transactionId": "TXN1005",
  "amount": 75000.0,
  "type": "Transfer",
  "location": "Mumbai",
  "recipient": "Merchant XYZ",
  "score": 85,
  "status": "HIGH RISK",
  "risk": "High",
  "icon": "🚨",
  "statusClass": "high-risk",
  "description": "This transaction looks highly risky and should be blocked or verified.",
  "explanation": "FraudGuard AI found strong fraud indicators: high transaction amount, unusual large transfer. Please verify this transaction immediately.",
  "detection": "High transaction amount, Unusual large transfer",
  "reasons": [
    "High transaction amount",
    "Unusual large transfer"
  ]
}
```

### 2.2 Get Transaction History
Retrieves transactions stored in MySQL ordered by latest timestamp first.
* **Endpoint:** `GET /api/fraud/transactions`
* **Access:** Public / Authenticated
* **Response:** Array of transaction objects.

### 2.3 Get Detection Statistics
Retrieves summary counts for total, approved, flagged, and blocked transactions.
* **Endpoint:** `GET /api/fraud/stats`
* **Access:** Public
* **Sample Response:**
```json
{
  "total": 45,
  "approved": 38,
  "flagged": 4,
  "blocked": 3,
  "suspiciousTotal": 7
}
```

---

## 3. Administrator Endpoints

> [!NOTE]
> All `/api/admin/**` endpoints require an `Authorization` header containing a valid Bearer JWT token from a user with the `ROLE_ADMIN` role:
> `Authorization: Bearer <token>`

### 3.1 Get Admin Dashboard Summary
* **Endpoint:** `GET /api/admin/dashboard`
* **Response:** Returns high-level metrics including total monitored transactions, flagged alert counts, resolved fraud cases, and monetary value saved.

### 3.2 List All Monitored Transactions
* **Endpoint:** `GET /api/admin/transactions`
* **Response:** Returns full historical transaction log with audit details.

### 3.3 Investigative Fraud Case Queue
* **Endpoint:** `GET /api/admin/fraud-cases`
* **Query Parameters:** `status` (optional: `OPEN`, `RESOLVED`, `DISMISSED`)
* **Response:** List of investigation case files.

### 3.4 Review / Resolve Fraud Case
* **Endpoint:** `PUT /api/admin/fraud-cases/{id}/review`
* **Request Body:**
```json
{
  "status": "RESOLVED",
  "notes": "Verified fraudulent transaction with cardholder."
}
```

### 3.5 Manage User Roles
* **Endpoint:** `PUT /api/admin/users/{id}/role`
* **Request Body:**
```json
{
  "role": "ADMIN"
}
```
