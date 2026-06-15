package com.fpt.shms.be.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.NotEmpty;
import lombok.Data;

import java.util.List;
import java.time.LocalDateTime;

@Data
public class CreateExpertRequest {

    @NotBlank(message = "Full name is required")
    private String fullName;

    @NotBlank(message = "Professional email is required")
    private String professionalEmail;

    @NotBlank(message = "Username is required")
    private String username;

    @NotBlank(message = "Password is required")
    private String password;

    @NotEmpty(message = "Role selection is required")
    private List<String> roleSelection;


    @NotNull(message = "Expiry date is required")
    @com.fasterxml.jackson.annotation.JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime accessExpiry;
}
