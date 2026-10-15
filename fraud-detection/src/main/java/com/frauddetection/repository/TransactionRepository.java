package com.frauddetection.repository;

import com.frauddetection.model.Transaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface TransactionRepository extends JpaRepository<Transaction, Long> {

    List<Transaction> findByUserIdOrderByTimestampDesc(Long userId);

    List<Transaction> findAllByOrderByTimestampDesc();

    long countByUserId(Long userId);

    long countByUserIdAndTimestampAfter(Long userId, LocalDateTime after);

    long countByStatus(Transaction.Status status);

    boolean existsByUserIdAndLocationIgnoreCase(Long userId, String location);

    boolean existsByUserIdAndDeviceId(Long userId, String deviceId);

    @Query("select avg(t.amount) from Transaction t where t.user.id = :userId")
    Double averageAmountForUser(@Param("userId") Long userId);
}
