package com.frauddetection.dto;

import com.frauddetection.model.FraudCase;
import com.frauddetection.model.Transaction;
import com.frauddetection.model.User;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

/** Request/response bodies for transactions, fraud cases and admin endpoints. */
public final class ApiDtos {

    private ApiDtos() {
    }

    // ---------- Requests ----------

    public record TransactionRequest(
            @NotNull @DecimalMin(value = "0.01", message = "must be greater than 0") BigDecimal amount,
            @NotBlank String merchant,
            String location,
            String deviceId) {
    }

    public record ReviewRequest(
            @NotNull FraudCase.Status status,
            String notes) {
    }

    public record RoleUpdateRequest(@NotNull User.Role role) {
    }

    // ---------- Responses ----------

    public record UserResponse(Long id, String name, String email, String role, LocalDateTime createdAt) {
        public static UserResponse from(User u) {
            return new UserResponse(u.getId(), u.getName(), u.getEmail(), u.getRole().name(), u.getCreatedAt());
        }
    }

    public record TransactionResponse(
            Long id,
            String userEmail,
            BigDecimal amount,
            String merchant,
            String location,
            String deviceId,
            LocalDateTime timestamp,
            int riskScore,
            String status,
            List<String> reasons) {

        public static TransactionResponse from(Transaction t, List<String> reasons) {
            return new TransactionResponse(t.getId(), t.getUser().getEmail(), t.getAmount(), t.getMerchant(),
                    t.getLocation(), t.getDeviceId(), t.getTimestamp(), t.getRiskScore(), t.getStatus().name(),
                    reasons);
        }

        public static TransactionResponse from(Transaction t) {
            return from(t, List.of());
        }
    }

    public record FraudCaseResponse(
            Long id,
            TransactionResponse transaction,
            int riskScore,
            List<String> reasons,
            String status,
            String adminNotes,
            String reviewedBy,
            LocalDateTime reviewedAt,
            LocalDateTime createdAt) {

        public static FraudCaseResponse from(FraudCase c) {
            List<String> reasons = c.getReasons() == null || c.getReasons().isBlank()
                    ? List.of()
                    : List.of(c.getReasons().split("; "));
            return new FraudCaseResponse(c.getId(), TransactionResponse.from(c.getTransaction(), reasons),
                    c.getRiskScore(), reasons, c.getStatus().name(), c.getAdminNotes(), c.getReviewedBy(),
                    c.getReviewedAt(), c.getCreatedAt());
        }
    }

    public record DashboardResponse(
            long totalUsers,
            long totalTransactions,
            long approved,
            long flagged,
            long blocked,
            long openCases,
            long confirmedFraud,
            long falsePositives) {
    }
}
