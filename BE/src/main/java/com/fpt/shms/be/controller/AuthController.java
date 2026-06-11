package com.fpt.shms.be.controller;

import com.fpt.shms.be.dto.LoginRequest;
import com.fpt.shms.be.dto.RegisterRequest;
import com.fpt.shms.be.dto.VerifyEmailRequest;
import com.fpt.shms.be.service.AuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
@Tag(name = "Auth", description = "Authentication and Registration APIs")
@Slf4j
public class AuthController {

    private final AuthService authService;

    @PostMapping("/register")
    @Operation(summary = "Register a new system account", description = "Registers a new student account and cross-checks with university verification data.")
    public ResponseEntity<?> register(@Valid @RequestBody RegisterRequest request) {
        try {
            String message = authService.register(request);
            return ResponseEntity.ok(Map.of("message", message));
        } catch (Exception e) {
            log.error("Exception occurred during registration flow for username: '{}'", request.getUsername(), e);
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/verify-email")
    @Operation(summary = "Verify Email with OTP", description = "Verifies the 6-digit OTP sent to the user's email within 3 minutes to activate the account.")
    public ResponseEntity<?> verifyEmail(@Valid @RequestBody VerifyEmailRequest request) {
        try {
            String message = authService.verifyEmail(request);
            return ResponseEntity.ok(Map.of("message", message));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/resend-otp")
    @Operation(summary = "Resend OTP", description = "Resends OTP to the user's registered email")
    public ResponseEntity<?> resendOtp(@RequestBody Map<String, String> request) {
        try {
            String username = request.get("username");
            if (username == null) throw new IllegalArgumentException("Username is required");
            String message = authService.resendOtp(username);
            return ResponseEntity.ok(Map.of("message", message));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/login")
    @Operation(summary = "Authenticate user", description = "Verifies username/password and generates a JWT with dynamic role context.")
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequest request) {
        try {
            java.util.Map<String, Object> result = authService.login(request);
            return ResponseEntity.ok(result);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }


}
