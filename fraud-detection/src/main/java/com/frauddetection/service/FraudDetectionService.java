package com.frauddetection.service;

import com.frauddetection.dto.ApiDtos.DashboardResponse;
import com.frauddetection.dto.ApiDtos.FraudCaseResponse;
import com.frauddetection.dto.ApiDtos.ReviewRequest;
import com.frauddetection.dto.ApiDtos.TransactionRequest;
import com.frauddetection.dto.ApiDtos.TransactionResponse;
import com.frauddetection.model.FraudCase;
import com.frauddetection.model.Transaction;
import com.frauddetection.model.User;
import com.frauddetection.repository.FraudCaseRepository;
import com.frauddetection.repository.TransactionRepository;
import com.frauddetection.repository.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Scores every transaction from 0-100 using behaviour-based rules and decides
 * APPROVED / FLAGGED / BLOCKED. Flagged and blocked transactions open a FraudCase
 * for admin review.
 */
@Service
public class FraudDetectionService {

    private final TransactionRepository transactionRepository;
    private final FraudCaseRepository fraudCaseRepository;
    private final UserRepository userRepository;

    @Value("${fraud.threshold.flag}")
    private int flagThreshold;
    @Value("${fraud.threshold.block}")
    private int blockThreshold;
    @Value("${fraud.high-amount}")
    private BigDecimal highAmount;
    @Value("${fraud.very-high-amount}")
    private BigDecimal veryHighAmount;

    public FraudDetectionService(TransactionRepository transactionRepository,
                                 FraudCaseRepository fraudCaseRepository,
                                 UserRepository userRepository) {
        this.transactionRepository = transactionRepository;
        this.fraudCaseRepository = fraudCaseRepository;
        this.userRepository = userRepository;
    }

    // =====================================================================
    //  Transactions
    // =====================================================================

    @Transactional
    public TransactionResponse processTransaction(String userEmail, TransactionRequest req) {
        User user = findUser(userEmail);

        Transaction tx = new Transaction();
        tx.setUser(user);
        tx.setAmount(req.amount());
        tx.setMerchant(req.merchant().trim());
        tx.setLocation(blankToNull(req.location()));
        tx.setDeviceId(blankToNull(req.deviceId()));
        tx.setTimestamp(LocalDateTime.now());

        // Score BEFORE saving, so the user's history doesn't include this transaction
        List<String> reasons = new ArrayList<>();
        int score = calculateRiskScore(user, tx, reasons);

        tx.setRiskScore(score);
        tx.setStatus(score >= blockThreshold ? Transaction.Status.BLOCKED
                : score >= flagThreshold ? Transaction.Status.FLAGGED
                : Transaction.Status.APPROVED);
        transactionRepository.save(tx);

        if (tx.getStatus() != Transaction.Status.APPROVED) {
            FraudCase fraudCase = new FraudCase();
            fraudCase.setTransaction(tx);
            fraudCase.setRiskScore(score);
            fraudCase.setReasons(String.join("; ", reasons));
            fraudCaseRepository.save(fraudCase);
        }

        return TransactionResponse.from(tx, reasons);
    }

    /** The fraud rules. Each rule that fires adds points and a reason. */
    private int calculateRiskScore(User user, Transaction tx, List<String> reasons) {
        Long userId = user.getId();
        int score = 0;
        long history = transactionRepository.countByUserId(userId);

        // 1. Large amount
        if (tx.getAmount().compareTo(veryHighAmount) >= 0) {
            score += 40;
            reasons.add("Very high amount (>= " + veryHighAmount.toPlainString() + ")");
        } else if (tx.getAmount().compareTo(highAmount) >= 0) {
            score += 25;
            reasons.add("High amount (>= " + highAmount.toPlainString() + ")");
        }

        // 2. Much bigger than this user's normal spending
        if (history >= 3) {
            Double avg = transactionRepository.averageAmountForUser(userId);
            if (avg != null && avg > 0 && tx.getAmount().doubleValue() > avg * 5) {
                score += 25;
                reasons.add(String.format("Amount is more than 5x the user's average (%.2f)", avg));
            }
        }

        // 3. Velocity - many transactions in a short time
        long recent = transactionRepository.countByUserIdAndTimestampAfter(userId,
                LocalDateTime.now().minusMinutes(10));
        if (recent >= 5) {
            score += 25;
            reasons.add(recent + " transactions in the last 10 minutes");
        }

        // 4. New location
        if (history > 0 && tx.getLocation() != null
                && !transactionRepository.existsByUserIdAndLocationIgnoreCase(userId, tx.getLocation())) {
            score += 15;
            reasons.add("New location: " + tx.getLocation());
        }

        // 5. New device
        if (history > 0 && tx.getDeviceId() != null
                && !transactionRepository.existsByUserIdAndDeviceId(userId, tx.getDeviceId())) {
            score += 15;
            reasons.add("New device: " + tx.getDeviceId());
        }

        // 6. Unusual hour (midnight - 5 AM)
        LocalTime time = tx.getTimestamp().toLocalTime();
        if (time.isBefore(LocalTime.of(5, 0))) {
            score += 10;
            reasons.add("Unusual time (between 00:00 and 05:00)");
        }

        // 7. User has confirmed fraud before
        if (fraudCaseRepository.countByTransactionUserIdAndStatus(userId, FraudCase.Status.CONFIRMED_FRAUD) > 0) {
            score += 15;
            reasons.add("User has previously confirmed fraud");
        }

        return Math.min(score, 100);
    }

    @Transactional(readOnly = true)
    public List<TransactionResponse> getUserTransactions(String userEmail) {
        User user = findUser(userEmail);
        return transactionRepository.findByUserIdOrderByTimestampDesc(user.getId())
                .stream().map(TransactionResponse::from).toList();
    }

    /** Users can only see their own transactions; admins can see any. */
    @Transactional(readOnly = true)
    public TransactionResponse getTransaction(Long id, String userEmail, boolean isAdmin) {
        Transaction tx = transactionRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Transaction not found"));
        if (!isAdmin && !tx.getUser().getEmail().equals(userEmail)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Transaction not found");
        }
        return TransactionResponse.from(tx);
    }

    @Transactional(readOnly = true)
    public List<TransactionResponse> getAllTransactions() {
        return transactionRepository.findAllByOrderByTimestampDesc()
                .stream().map(TransactionResponse::from).toList();
    }

    // =====================================================================
    //  Fraud cases (admin)
    // =====================================================================

    @Transactional(readOnly = true)
    public List<FraudCaseResponse> getFraudCases(FraudCase.Status status) {
        List<FraudCase> cases = status == null
                ? fraudCaseRepository.findAllByOrderByCreatedAtDesc()
                : fraudCaseRepository.findByStatusOrderByCreatedAtDesc(status);
        return cases.stream().map(FraudCaseResponse::from).toList();
    }

    @Transactional
    public FraudCaseResponse reviewCase(Long caseId, ReviewRequest req, String adminEmail) {
        FraudCase fraudCase = fraudCaseRepository.findById(caseId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Fraud case not found"));

        fraudCase.setStatus(req.status());
        fraudCase.setAdminNotes(req.notes());
        fraudCase.setReviewedBy(adminEmail);
        fraudCase.setReviewedAt(LocalDateTime.now());

        // Update the transaction to match the admin's decision
        Transaction tx = fraudCase.getTransaction();
        switch (req.status()) {
            case CONFIRMED_FRAUD -> tx.setStatus(Transaction.Status.BLOCKED);
            case FALSE_POSITIVE -> tx.setStatus(Transaction.Status.APPROVED);
            case OPEN -> { /* re-opened: leave transaction as it is */ }
        }
        return FraudCaseResponse.from(fraudCase);
    }

    @Transactional(readOnly = true)
    public DashboardResponse getDashboard() {
        return new DashboardResponse(
                userRepository.count(),
                transactionRepository.count(),
                transactionRepository.countByStatus(Transaction.Status.APPROVED),
                transactionRepository.countByStatus(Transaction.Status.FLAGGED),
                transactionRepository.countByStatus(Transaction.Status.BLOCKED),
                fraudCaseRepository.countByStatus(FraudCase.Status.OPEN),
                fraudCaseRepository.countByStatus(FraudCase.Status.CONFIRMED_FRAUD),
                fraudCaseRepository.countByStatus(FraudCase.Status.FALSE_POSITIVE));
    }

    // =====================================================================

    private User findUser(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not found"));
    }

    private static String blankToNull(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }
}
