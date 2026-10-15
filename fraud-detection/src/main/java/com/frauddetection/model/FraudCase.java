package com.frauddetection.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

/** Created when a transaction is FLAGGED or BLOCKED, so an admin can review it. */
@Entity
@Table(name = "fraud_cases")
@Getter
@Setter
@NoArgsConstructor
public class FraudCase {

    public enum Status { OPEN, CONFIRMED_FRAUD, FALSE_POSITIVE }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "transaction_id", unique = true)
    private Transaction transaction;

    private int riskScore;

    /** Human-readable reasons the transaction was suspicious, separated by "; ". */
    @Column(length = 1000)
    private String reasons;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Status status = Status.OPEN;

    @Column(length = 1000)
    private String adminNotes;

    private String reviewedBy;

    private LocalDateTime reviewedAt;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();
}
