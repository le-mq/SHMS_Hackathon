package com.fpt.shms.be.dto;

import jakarta.validation.constraints.Email;
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
    // BR-ACC-01: Strong password
    @Pattern(regexp = "^(?=.*[A-Za-z])(?=.*\\d)[A-Za-z\\d@$!%*#?&]{8,}$", 
             message = "Password must be at least 8 characters long and contain at least one letter and one number")
    private String password;

    @NotBlank(message = "Target University is required")
    private String targetUniversity;

    @NotBlank(message = "Student Identification Number (MSSV) is required")
    // BR-ACC-03: MSSV format (e.g., SE123456)
    @Pattern(regexp = "^[A-Z]{2}\\d{6}$", message = "MSSV must start with 2 uppercase letters followed by 6 digits")
    private String mssv;

    @NotBlank(message = "Major is required")
    private String major;

    @NotBlank(message = "Corporate Email is required")
    @Email(message = "Invalid email format")
    // BR-ACC-02: Corporate Email format (typically ends with .edu.vn for universities)
    @Pattern(regexp = "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$", message = "Must be a valid corporate email")
    private String corporateEmail;
}
