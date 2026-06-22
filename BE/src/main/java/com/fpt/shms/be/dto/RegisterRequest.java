package com.fpt.shms.be.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class RegisterRequest {

    @NotBlank(message = "Full Name is required")
    private String fullName;

    @NotBlank(message = "Username is required")
    @Size(min = 4, max = 20, message = "Username must be between 4 and 20 characters")
    @Pattern(regexp = "^[a-zA-Z0-9_]+$", message = "Username can only contain alphanumeric characters and underscores")
    private String username;

    @NotBlank(message = "Password is required")
    @Pattern(regexp = "^(?=.*[A-Za-z])(?=.*\\d)[A-Za-z\\d@$!%*#?&]{8,}$",
            message = "Password must be at least 8 characters long and contain at least one letter and one number")
    private String password;

    @NotBlank(message = "Target University is required")
    private String targetUniversity;

    @NotBlank(message = "Student Identification Number is required")
    private String studentCode;

    @NotBlank(message = "Major is required")
    private String major;

    @NotBlank(message = "Corporate Email is required")
    private String corporateEmail;
}
