# 🚀 Deployment & Hosting Guide

This guide covers options for hosting FraudGuard AI locally, in containers, and across modern cloud providers.

---

## 1. Local Deployment (Windows, macOS, Linux)

### Prerequisites
* **Java Development Kit (JDK 21 or higher)**: Tested on Java 25 & 26.
* **MySQL Server 8.0**: Running locally on port `3306`.
* **Git**: Installed and configured.

### Quick Start (Windows)
Double-click [`run-website.bat`](../run-website.bat) in the project root directory.

### Manual Command Line Launch
1. Ensure your MySQL service is active:
   ```powershell
   Get-Service -Name "*mysql*"   # On Windows
   ```
2. Navigate to the backend directory and launch via Maven Wrapper:
   ```bash
   cd fraud-detection
   ./mvnw spring-boot:run        # On Linux/macOS
   mvnw.cmd spring-boot:run      # On Windows
   ```
3. Open your browser and visit:
   `http://localhost:8080/index.html`

### Running the Packaged Production JAR
Build and run the standalone optimized JAR without requiring Maven:
```bash
cd fraud-detection
mvnw.cmd clean package -DskipTests
java -jar target/fraud-detection-0.0.1-SNAPSHOT.jar
```

---

## 2. Cloud Hosting Options

### 2.1 Free Static Frontend Deployment (Netlify / Vercel / GitHub Pages)
The [`team-frontend/`](../team-frontend/) folder can be deployed independently as a static web application:

* **Netlify Drop (Zero Configuration)**:
  1. Open [app.netlify.com/drop](https://app.netlify.com/drop).
  2. Drag and drop the `team-frontend` folder directly.
  3. Your application is live with free SSL.
* **GitHub Pages**:
  1. Push this repository to GitHub.
  2. Navigate to **Settings** &rarr; **Pages**.
  3. Under **Branch**, select `main` and set the folder to `/team-frontend`.
  4. Click **Save**.

### 2.2 Full-Stack Cloud Deployment (Railway / Render)
To host both the Java REST API and the MySQL database in the cloud:

1. **Database Setup**:
   * Create a free MySQL database on [Railway](https://railway.app) or [Aiven](https://aiven.io).
   * Note your connection URL, port, username, and password.
2. **Backend Web Service Setup**:
   * Link your GitHub repository to Railway or [Render](https://render.com).
   * Specify the build command:
     ```bash
     mvn clean package -DskipTests
     ```
   * Specify the start command:
     ```bash
     java -jar target/fraud-detection-0.0.1-SNAPSHOT.jar
     ```
   * Set Environment Variables:
     * `SPRING_DATASOURCE_URL`: `jdbc:mysql://<host>:<port>/<dbname>`
     * `SPRING_DATASOURCE_USERNAME`: `<your-db-user>`
     * `SPRING_DATASOURCE_PASSWORD`: `<your-db-password>`
     * `SERVER_PORT`: `8080` (or `$PORT`)

---

## 3. Instant Public Demo via Tunnels

To share the local server running on your computer with remote collaborators or reviewers without deploying to the cloud:

### Using Localtunnel
```bash
npx localtunnel --port 8080
```

### Using Cloudflare Tunnel
```bash
cloudflared tunnel --url http://localhost:8080
```
