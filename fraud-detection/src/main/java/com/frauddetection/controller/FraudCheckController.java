package com.frauddetection.controller;

import com.frauddetection.model.FraudCase;
import com.frauddetection.model.Transaction;
import com.frauddetection.model.User;
import com.frauddetection.repository.FraudCaseRepository;
import com.frauddetection.repository.TransactionRepository;
import com.frauddetection.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.*;

@CrossOrigin(origins = "*")
@RestController
@RequestMapping("/api/fraud")
public class FraudCheckController {

    private final TransactionRepository transactionRepository;
    private final FraudCaseRepository fraudCaseRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public FraudCheckController(TransactionRepository transactionRepository,
                                FraudCaseRepository fraudCaseRepository,
                                UserRepository userRepository,
                                PasswordEncoder passwordEncoder) {
        this.transactionRepository = transactionRepository;
        this.fraudCaseRepository = fraudCaseRepository;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    public static class FraudCheckRequest {
        private String transactionId;
        private double amount;
        private String transactionType;
        private String location;
        private String recipient;

        public String getTransactionId() { return transactionId; }
        public void setTransactionId(String transactionId) { this.transactionId = transactionId; }
        public double getAmount() { return amount; }
        public void setAmount(double amount) { this.amount = amount; }
        public String getTransactionType() { return transactionType; }
        public void setTransactionType(String transactionType) { this.transactionType = transactionType; }
        public String getLocation() { return location; }
        public void setLocation(String location) { this.location = location; }
        public String getRecipient() { return recipient; }
        public void setRecipient(String recipient) { this.recipient = recipient; }
    }

    public static class FraudCheckResponse {
        private String transactionId;
        private double amount;
        private String type;
        private String location;
        private String recipient;
        private int score;
        private String status;
        private String risk;
        private String icon;
        private String statusClass;
        private String description;
        private String explanation;
        private String detection;
        private List<String> reasons;

        public FraudCheckResponse(String transactionId, double amount, String type, String location, String recipient,
                                  int score, String status, String risk, String icon, String statusClass,
                                  String description, String explanation, String detection, List<String> reasons) {
            this.transactionId = transactionId;
            this.amount = amount;
            this.type = type;
            this.location = location;
            this.recipient = recipient;
            this.score = score;
            this.status = status;
            this.risk = risk;
            this.icon = icon;
            this.statusClass = statusClass;
            this.description = description;
            this.explanation = explanation;
            this.detection = detection;
            this.reasons = reasons;
        }

        public String getTransactionId() { return transactionId; }
        public double getAmount() { return amount; }
        public String getType() { return type; }
        public String getLocation() { return location; }
        public String getRecipient() { return recipient; }
        public int getScore() { return score; }
        public String getStatus() { return status; }
        public String getRisk() { return risk; }
        public String getIcon() { return icon; }
        public String getStatusClass() { return statusClass; }
        public String getDescription() { return description; }
        public String getExplanation() { return explanation; }
        public String getDetection() { return detection; }
        public List<String> getReasons() { return reasons; }
    }

    @PostMapping("/check")
    public FraudCheckResponse checkFraud(@RequestBody FraudCheckRequest req) {
        String txnId = req.getTransactionId() != null && !req.getTransactionId().trim().isEmpty()
                ? req.getTransactionId().trim()
                : "TXN" + (System.currentTimeMillis() % 10000);
        double amount = req.getAmount();
        String type = req.getTransactionType() != null ? req.getTransactionType() : "Payment";
        String location = req.getLocation() != null ? req.getLocation().trim() : "";
        String recipient = req.getRecipient() != null ? req.getRecipient().trim() : "Store";

        int score = 10;
        List<String> reasons = new ArrayList<>();

        if (amount >= 40000) {
            score += 60;
            reasons.add("High transaction amount");
        } else if (amount >= 15000) {
            score += 25;
            reasons.add("Above-average transaction amount");
        }

        String locationKey = location.toLowerCase();
        if (locationKey.equals("unknown") || locationKey.isEmpty()) {
            score += 30;
            reasons.add("Unknown location");
        }

        if ("Transfer".equalsIgnoreCase(type) && amount >= 15000) {
            score += 20;
            reasons.add("Unusual large transfer");
        }

        if ("Withdrawal".equalsIgnoreCase(type) && amount >= 20000) {
            score += 15;
            reasons.add("Large cash withdrawal");
        }

        if (score > 99) score = 99;

        String status = "SAFE";
        String risk = "Low";
        String icon = "🛡️";
        String statusClass = "safe";
        String description = "This transaction appears to be normal.";
        String explanation = "No unusual pattern was found. Amount, type and location are within normal limits.";

        if (score >= 70) {
            status = "HIGH RISK";
            risk = "High";
            icon = "🚨";
            statusClass = "high-risk";
            description = "This transaction looks highly risky and should be blocked or verified.";
            explanation = "FraudGuard AI found strong fraud indicators: " +
                    String.join(", ", reasons).toLowerCase() +
                    ". Please verify this transaction immediately.";
        } else if (score >= 40) {
            status = "SUSPICIOUS";
            risk = "Medium";
            icon = "⚠️";
            statusClass = "suspicious";
            description = "This transaction looks unusual and needs a review.";
            explanation = "FraudGuard AI flagged this transaction because of: " +
                    String.join(", ", reasons).toLowerCase() +
                    ". Please review before approving.";
        }

        String detection = !reasons.isEmpty() ? String.join(", ", reasons) : "Normal Activity";

        // Save transaction to MySQL database
        try {
            User user = userRepository.findByEmail("admin@frauddetection.com")
                    .orElseGet(() -> userRepository.findAll().stream().findFirst().orElse(null));
            if (user != null) {
                Transaction entity = new Transaction();
                entity.setUser(user);
                entity.setAmount(BigDecimal.valueOf(amount));
                entity.setLocation(location);
                entity.setMerchant(recipient);
                entity.setDeviceId("web-client");
                entity.setRiskScore(score);
                if (score >= 70) {
                    entity.setStatus(Transaction.Status.BLOCKED);
                } else if (score >= 40) {
                    entity.setStatus(Transaction.Status.FLAGGED);
                } else {
                    entity.setStatus(Transaction.Status.APPROVED);
                }
                Transaction saved = transactionRepository.save(entity);

                if (entity.getStatus() != Transaction.Status.APPROVED) {
                    FraudCase fraudCase = new FraudCase();
                    fraudCase.setTransaction(saved);
                    fraudCase.setRiskScore(score);
                    fraudCase.setReasons(detection);
                    fraudCase.setStatus(FraudCase.Status.OPEN);
                    fraudCaseRepository.save(fraudCase);
                }
            }
        } catch (Exception e) {
            System.err.println("Could not persist transaction to DB: " + e.getMessage());
        }

        return new FraudCheckResponse(
                txnId, amount, type, location, recipient,
                score, status, risk, icon, statusClass,
                description, explanation, detection, reasons
        );
    }

    /** Returns all transactions directly from the MySQL database */
    @org.springframework.transaction.annotation.Transactional(readOnly = true)
    @GetMapping("/transactions")
    public List<Map<String, Object>> getAllTransactions() {
        List<Transaction> list = transactionRepository.findAllByOrderByTimestampDesc();
        List<Map<String, Object>> result = new ArrayList<>();
        for (Transaction tx : list) {
            Map<String, Object> map = new HashMap<>();
            map.put("id", "TXN" + tx.getId());
            map.put("user", tx.getUser() != null ? tx.getUser().getName() : "User");
            map.put("amount", tx.getAmount());
            map.put("type", "Payment");
            map.put("location", tx.getLocation() != null && !tx.getLocation().isEmpty() ? tx.getLocation() : "Delhi");
            map.put("recipient", tx.getMerchant() != null && !tx.getMerchant().isEmpty() ? tx.getMerchant() : "Store");

            String status = "SAFE";
            String risk = "Low";
            if (tx.getStatus() == Transaction.Status.BLOCKED) {
                status = "HIGH RISK";
                risk = "High";
            } else if (tx.getStatus() == Transaction.Status.FLAGGED) {
                status = "SUSPICIOUS";
                risk = "Medium";
            }
            map.put("status", status);
            map.put("risk", risk);
            map.put("score", tx.getRiskScore());
            map.put("reason", tx.getStatus() == Transaction.Status.APPROVED ? "Normal Activity" : "Suspicious transaction pattern");
            map.put("date", tx.getTimestamp() != null ? tx.getTimestamp().toString().replace("T", " ").substring(0, Math.min(19, tx.getTimestamp().toString().length())) : "");
            result.add(map);
        }
        return result;
    }

    /** Returns statistics directly from the MySQL database */
    @GetMapping("/stats")
    public Map<String, Object> getStats() {
        long total = transactionRepository.count();
        long approved = transactionRepository.countByStatus(Transaction.Status.APPROVED);
        long flagged = transactionRepository.countByStatus(Transaction.Status.FLAGGED);
        long blocked = transactionRepository.countByStatus(Transaction.Status.BLOCKED);

        Map<String, Object> stats = new HashMap<>();
        stats.put("total", total);
        stats.put("approved", approved);
        stats.put("flagged", flagged);
        stats.put("blocked", blocked);
        stats.put("suspiciousTotal", flagged + blocked);
        return stats;
    }

    /** Authenticates user with MySQL users table */
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> body) {
        String email = body.get("email");
        String password = body.get("password");
        if (email == null || password == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Email and password required"));
        }
        Optional<User> opt = userRepository.findByEmail(email.trim().toLowerCase());
        if (opt.isEmpty() || !passwordEncoder.matches(password, opt.get().getPassword())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Invalid email or password"));
        }
        User u = opt.get();
        return ResponseEntity.ok(Map.of(
                "name", u.getName(),
                "email", u.getEmail(),
                "role", u.getRole().name()
        ));
    }

    /** Registers a user into the MySQL users table */
    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody Map<String, String> body) {
        String name = body.get("name");
        String email = body.get("email");
        String password = body.get("password");
        String roleStr = body.getOrDefault("role", "USER");

        if (name == null || email == null || password == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Missing required fields"));
        }
        email = email.trim().toLowerCase();
        if (userRepository.findByEmail(email).isPresent()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Email is already registered in MySQL"));
        }
        User user = new User();
        user.setName(name);
        user.setEmail(email);
        user.setPassword(passwordEncoder.encode(password));
        user.setRole("ADMIN".equalsIgnoreCase(roleStr) ? User.Role.ADMIN : User.Role.USER);
        userRepository.save(user);

        return ResponseEntity.ok(Map.of(
                "name", user.getName(),
                "email", user.getEmail(),
                "role", user.getRole().name(),
                "message", "User successfully registered in MySQL database!"
        ));
    }
}
