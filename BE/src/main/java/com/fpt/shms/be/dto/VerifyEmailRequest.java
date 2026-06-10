package com.fpt.shms.be.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class VerifyEmailRequest {
    @NotBlank(message = "Username is required")
    private String username;

    @NotBlank(message = "OTP Token is required")
    private String otp;
}
