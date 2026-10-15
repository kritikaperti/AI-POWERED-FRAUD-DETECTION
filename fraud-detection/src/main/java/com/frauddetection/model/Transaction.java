package com.frauddetection.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "transactions")
@Getter
@Setter
@NoArgsConstructor
public class Transaction {

    public enum Status { APPROVED, FLAGGED, BLOCKED }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id")
    private User user;

    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal amount;

    @Column(nullable = false)
    private String merchant;

    private String location;

    private String deviceId;

    @Column(nullable = false)
    private LocalDateTime timestamp = LocalDateTime.now();

    /** 0 (safe) to 100 (almost certainly fraud). */
    private int riskScore;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Status status = Status.APPROVED;
}
