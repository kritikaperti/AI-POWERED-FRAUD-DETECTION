package com.frauddetection.controller;

import com.frauddetection.dto.ApiDtos.DashboardResponse;
import com.frauddetection.dto.ApiDtos.FraudCaseResponse;
import com.frauddetection.dto.ApiDtos.ReviewRequest;
import com.frauddetection.dto.ApiDtos.RoleUpdateRequest;
import com.frauddetection.dto.ApiDtos.TransactionResponse;
import com.frauddetection.dto.ApiDtos.UserResponse;
import com.frauddetection.model.FraudCase;
import com.frauddetection.model.User;
import com.frauddetection.repository.UserRepository;
import com.frauddetection.service.FraudDetectionService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

/** Admin-only endpoints (protected by SecurityConfig: /api/admin/** requires ROLE_ADMIN). */
@RestController
@RequestMapping("/api/admin")
public class AdminController {

    private final FraudDetectionService fraudDetectionService;
    private final UserRepository userRepository;

    public AdminController(FraudDetectionService fraudDetectionService, UserRepository userRepository) {
        this.fraudDetectionService = fraudDetectionService;
        this.userRepository = userRepository;
    }

    @GetMapping("/dashboard")
    public DashboardResponse dashboard() {
        return fraudDetectionService.getDashboard();
    }

    @GetMapping("/transactions")
    public List<TransactionResponse> allTransactions() {
        return fraudDetectionService.getAllTransactions();
    }

    /** Optional filter: /api/admin/fraud-cases?status=OPEN */
    @GetMapping("/fraud-cases")
    public List<FraudCaseResponse> fraudCases(@RequestParam(required = false) FraudCase.Status status) {
        return fraudDetectionService.getFraudCases(status);
    }

    @PutMapping("/fraud-cases/{id}/review")
    public FraudCaseResponse review(@PathVariable Long id, @Valid @RequestBody ReviewRequest request,
                                    Authentication auth) {
        return fraudDetectionService.reviewCase(id, request, auth.getName());
    }

    @GetMapping("/users")
    public List<UserResponse> users() {
        return userRepository.findAll().stream().map(UserResponse::from).toList();
    }

    /** Promote a user to ADMIN or demote back to USER. */
    @PutMapping("/users/{id}/role")
    @Transactional
    public UserResponse changeRole(@PathVariable Long id, @Valid @RequestBody RoleUpdateRequest request,
                                   Authentication auth) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        if (user.getEmail().equals(auth.getName()) && request.role() != User.Role.ADMIN) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "You cannot remove your own admin role");
        }
        user.setRole(request.role());
        return UserResponse.from(user);
    }
}
