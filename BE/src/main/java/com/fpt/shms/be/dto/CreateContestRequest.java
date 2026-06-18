package com.fpt.shms.be.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class CreateContestRequest {

    @NotBlank(message = "Event name is required")
    private String name;

    private String theme;

    @NotBlank(message = "Term is required")
    private String term; // SPRING, SUMMER, FALL, WINTER

    @NotNull(message = "Year is required")
    private Integer year;

    private String status; // ACTIVE, UPCOMING, CLOSED

    private java.time.LocalDate registrationStart;
    private java.time.LocalDate registrationEnd;

    @NotBlank(message = "Region scope is required")
    private String regionScope;

    @NotNull(message = "Maximum allowed teams is required")
    @Min(value = 1, message = "Maximum teams must be at least 1")
    private Integer maximumAllowedTeams;

    @NotBlank(message = "Allowed corporate domains is required")
    private String allowedCorporateDomains;

    private String complianceRules;
    private String tieredPrizeStructures;
}
