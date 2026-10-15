# 🏗️ System Architecture & Design Breakdown

The **AI-Powered Fraud Detection System** (FraudGuard AI) is an enterprise financial security solution engineered to intercept, evaluate, and mitigate suspicious financial transactions in real time.

---

## 1. High-Level Architectural Diagram

```mermaid
flowchart TD
    subgraph Client ["Client Presentation Tier (team-frontend)"]
        UI["Modern Web Interface\n(HTML5, CSS3, JavaScript)"]
        Landing["Landing & Auth\n(index, login, register)"]
        UserDash["User Dashboard & Scanner\n(transaction.html, history.html)"]
        AdminDash["Admin Portal\n(admin.html, alerts, reports)"]
    end

    subgraph API_GW ["Security & REST Controller Layer"]
        Security["Spring Security 6 + JWT Filter"]
        AuthCtrl["AuthController\n(/api/auth/**)"]
        FraudCtrl["FraudCheckController\n(/api/fraud/**)"]
        AdminCtrl["AdminController\n(/api/admin/**)"]
    end

    subgraph Core_Services ["Service & Intelligence Tier"]
        FraudService["FraudDetectionService\n• Rule & Threshold Engine\n• Anomaly & Velocity Detection\n• Risk Score Calculation (0-100)"]
        AuthService["AuthService\n• BCrypt Hashing\n• Token Generation & Validation"]
    end

    subgraph Persistence ["Persistence Tier (MySQL 8.0)"]
        UsersTable[("users\nCredentials & Roles")]
        TxnsTable[("transactions\nTransaction Logs & Scores")]
        CasesTable[("fraud_cases\nInvestigative Case Queue")]
        SessionsTable[("spring_session\nSession Registry")]
    end

    UI --> Landing & UserDash & AdminDash
    UserDash & AdminDash -->|REST / JSON Requests| Security
    Security --> AuthCtrl & FraudCtrl & AdminCtrl
    AuthCtrl --> AuthService
    FraudCtrl --> FraudService
    AdminCtrl --> FraudService
    AuthService --> UsersTable
    FraudService --> TxnsTable & CasesTable
```

---

## 2. Core Architectural Components

### 2.1 Client Presentation Layer (`team-frontend`)
* **Responsive Multi-Dashboard UI**: Tailored layouts for regular bank users and compliance/security admins.
* **Dual Operation Mode**:
  * **Online Connected Mode**: Synchronizes directly with the Spring Boot REST endpoints (`/api/fraud/*`).
  * **Resilient Offline / Fallback Mode**: If the backend is undergoing maintenance or network connectivity is interrupted, the client automatically executes local risk heuristic scoring and caches state in `localStorage`.

### 2.2 Security & Authentication Layer
* **Stateless JWT Architecture**: Employs JSON Web Tokens (`jjwt-api 0.12.6`) with cryptographic signing.
* **Role-Based Access Control (RBAC)**: Segregates normal account holders (`ROLE_USER`) from security investigators (`ROLE_ADMIN`).
* **BCrypt Password Encryption**: Strong salt-hashed password storage preventing credential compromise.

### 2.3 Fraud Detection & Scoring Engine (`FraudDetectionService`)
The detection pipeline computes an aggregate risk score ranging from `0` to `100` evaluated across multiple risk vectors:

| Risk Dimension | Heuristic / Threshold Criteria | Added Risk Points |
| :--- | :--- | :--- |
| **High Value Anomaly** | Amount exceeds `₹50,000` | +25 points |
| **Critical Spike** | Amount exceeds `₹100,000` | +40 points |
| **Channel Risk** | Transaction Type = `Withdrawal` or `Transfer` | +10 to +15 points |
| **Location Anomaly** | Cross-border or mismatched transaction origin | +20 points |
| **Velocity & Frequency** | Multiple transactions in rapid succession | +25 points |

#### Decision Matrix:
* **Score 0 – 39**: `SAFE` &rarr; Approved automatically.
* **Score 40 – 69**: `SUSPICIOUS` &rarr; Flagged for review; stepped-up verification required.
* **Score 70 – 100**: `BLOCKED` &rarr; Immediate payment halt; logged into `fraud_cases` queue for investigative review.

---

## 3. Data Flow & Transaction Lifecycle

```mermaid
sequenceDiagram
    autonumber
    actor User as Bank User
    participant Frontend as Frontend UI
    participant Backend as Spring Boot API
    participant Engine as Fraud Engine
    participant DB as MySQL Database
    actor Admin as Fraud Analyst

    User->>Frontend: Enter Transaction (Amount, Recipient, Type, Location)
    Frontend->>Backend: POST /api/fraud/check
    Backend->>Engine: evaluateTransaction(dto)
    Engine->>Engine: Calculate Risk Score (0-100)
    Engine->>DB: Persist Transaction (Risk Score, Status)
    alt Score >= 70 (Fraud Detected)
        Engine->>DB: Create Investigation Record in fraud_cases
        Backend-->>Frontend: Return Status: BLOCKED, Reasons, Explanations
    else Score between 40 and 69
        Backend-->>Frontend: Return Status: SUSPICIOUS / FLAGGED
    else Score < 40
        Backend-->>Frontend: Return Status: SAFE
    end
    Frontend-->>User: Display Risk Gauge & Actionable Details
    Admin->>Backend: GET /api/admin/fraud-cases (JWT Authorized)
    Backend->>DB: Fetch Flagged Cases
    DB-->>Admin: View Case Queue & Resolve Investigation
```

---

## 4. Scalability & Future Roadmap
* **Asynchronous Ingestion via Apache Kafka**: Decouple high-velocity transaction streams from storage.
* **ONNX / Python Microservice Integration**: Seamless connection to Python-trained ensemble models (XGBoost, Random Forest, PyTorch LSTM) and SHAP explainability trees.
* **Elasticsearch / OpenSearch**: Real-time log indexing for forensic compliance audits.
