package com.frauddetection.controller;

import com.frauddetection.dto.ApiDtos.TransactionRequest;
import com.frauddetection.dto.ApiDtos.TransactionResponse;
import com.frauddetection.service.FraudDetectionService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/** Endpoints for any logged-in user. */
@RestController
@RequestMapping("/api/transactions")
public class TransactionController {

    private final FraudDetectionService fraudDetectionService;

    public TransactionController(FraudDetectionService fraudDetectionService) {
        this.fraudDetectionService = fraudDetectionService;
    }

    /** Submit a transaction; it is scored and APPROVED / FLAGGED / BLOCKED immediately. */
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public TransactionResponse create(@Valid @RequestBody TransactionRequest request, Authentication auth) {
        return fraudDetectionService.processTransaction(auth.getName(), request);
    }

    @GetMapping
    public List<TransactionResponse> myTransactions(Authentication auth) {
        return fraudDetectionService.getUserTransactions(auth.getName());
    }

    @GetMapping("/{id}")
    public TransactionResponse getOne(@PathVariable Long id, Authentication auth) {
        boolean isAdmin = auth.getAuthorities().stream()
                .anyMatch(a -> "ROLE_ADMIN".equals(a.getAuthority()));
        return fraudDetectionService.getTransaction(id, auth.getName(), isAdmin);
    }
}
