package com.frauddetection.repository;

import com.frauddetection.model.FraudCase;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface FraudCaseRepository extends JpaRepository<FraudCase, Long> {

    List<FraudCase> findAllByOrderByCreatedAtDesc();

    List<FraudCase> findByStatusOrderByCreatedAtDesc(FraudCase.Status status);

    long countByStatus(FraudCase.Status status);

    long countByTransactionUserIdAndStatus(Long userId, FraudCase.Status status);
}
