package com.fpt.shms.be.dto;
import java.util.List;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class UniversityDto {
    private Long id;

    @NotBlank(message = "Institution name is required")
    private String name;

    private String emailRegex;

    private String studentCodeRegex;

    private List<String> sampleEmails;

    private List<String> sampleStudentIds;

    @NotBlank(message = "University code is required")
    private String universityCode;
}
