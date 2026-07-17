package com.fpt.shms.be.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class CreateContestRequest {

    private Long id;

    @NotBlank(message = "Event name is required")
    private String name;

    private String theme;
    private String description;

    @NotBlank(message = "Term is required")
    private String term; // SPRING, SUMMER, FALL, WINTER

    @NotNull(message = "Year is required")
    private Integer year;

    private String status; // ACTIVE, UPCOMING, CLOSED

    private java.time.LocalDate registrationStart;
    private java.time.LocalDate registrationEnd;

    // --- MỚI THÊM: Thời gian đóng cuộc thi ---
    @com.fasterxml.jackson.annotation.JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private java.time.LocalDateTime contestEndAt;

    @NotNull(message = "Maximum allowed teams is required")
    @Min(value = 1, message = "Maximum teams must be at least 1")
    private Integer maximumAllowedTeams;

    @NotNull(message = "Minimum team members is required")
    @Min(value = 1, message = "Minimum team members must be at least 1")
    private Integer minTeamMembers;

    @NotNull(message = "Maximum team members is required")
    @Min(value = 1, message = "Maximum team members must be at least 1")
    private Integer maxTeamMembers;

    @NotBlank(message = "Allowed corporate domains is required")
    private String allowedCorporateDomains;

    private String complianceRules;
    private String tieredPrizeStructures;

    private String location;

    @com.fasterxml.jackson.annotation.JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private java.time.LocalDateTime publishedAt;

    @com.fasterxml.jackson.annotation.JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private java.time.LocalDateTime contestStartAt;
}