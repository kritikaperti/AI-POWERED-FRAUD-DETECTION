# ⚙️ FraudGuard Backend Service (Spring Boot)

This service constitutes the core REST API, fraud evaluation engine, and MySQL data access layer.

---

## 🛠️ Technology Stack
* **Java**: OpenJDK 21+ (Compatible with Java 25 & 26)
* **Framework**: Spring Boot 4.1.1
* **Data Access**: Spring Data JPA & Hibernate 7.4
* **Database**: MySQL Server 8.0
* **Security**: Spring Security 6, JJWT 0.12.6, BCrypt
* **Build System**: Apache Maven with Maven Wrapper (`mvnw`)

---

## ⚙️ Configuration
Application settings are located in `src/main/resources/application.properties`:

```properties
spring.application.name=fraud-detection

# MySQL Database Configuration
spring.datasource.url=jdbc:mysql://localhost:3306/frauddb?createDatabaseIfNotExist=true&useSSL=false&serverTimezone=UTC&allowPublicKeyRetrieval=true
spring.datasource.username=root
spring.datasource.password=admin
spring.datasource.driver-class-name=com.mysql.cj.jdbc.Driver

# JPA / Hibernate
spring.jpa.hibernate.ddl-auto=update
spring.jpa.show-sql=true

# JWT Token Configuration
jwt.secret=FraudDetectionSecretKey2024VeryLongAndSecure
jwt.expiration=86400000

# Default Admin Account
app.admin.name=Admin
app.admin.email=admin@frauddetection.com
app.admin.password=admin123

# Fraud Scoring Thresholds
fraud.threshold.flag=40
fraud.threshold.block=70
fraud.high-amount=50000
fraud.very-high-amount=100000
```

---

## 🔨 Building and Running

### Run Development Server
```bash
./mvnw spring-boot:run        # Linux / macOS
mvnw.cmd spring-boot:run      # Windows
```

### Build Production JAR
```bash
mvnw.cmd clean package -DskipTests
```
The executable JAR will be generated at `target/fraud-detection-0.0.1-SNAPSHOT.jar`.

### Run Standalone JAR
```bash
java -jar target/fraud-detection-0.0.1-SNAPSHOT.jar
```
Server starts on port `8080`.
