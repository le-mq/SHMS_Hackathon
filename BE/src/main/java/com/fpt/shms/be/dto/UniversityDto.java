package com.fpt.shms.be.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class UniversityDto {
    private Long id;

    @NotBlank(message = "Institution name is required")
    private String name;

    private String emailRegex;

    @NotBlank(message = "Student Code Regex is required")
    private String studentCodeRegex;

    @NotBlank(message = "University code is required")
    private String universityCode;
}
