package com.fpt.shms.be.dto;

import com.fpt.shms.be.model.Contest;

import java.time.LocalDate;

/**
 * DTO representing a single seasonal hackathon for the public home page.
 */
public record ContestDTO(
        Long id,
        String name,
        String season,
        Integer year,
        LocalDate registrationStart,
        LocalDate registrationEnd,
        java.time.LocalDateTime closedAt,
        String status,
        String description,
        String regionScope,
        Integer maximumAllowedTeams,
        String complianceRules,
        String tieredPrizeStructures,
        java.util.List<CategoryDTO> categories,
        java.util.List<RoundDTO> rounds
) {
    public record RoundDTO(String phaseName, java.time.LocalDateTime submissionOpen, java.time.LocalDateTime submissionDeadline) {}
    public record CategoryDTO(Long id, String name, java.util.List<RoundDTO> rounds) {}

    public static ContestDTO from(Contest c) {
        return from(c, null, null);
    }

    public static ContestDTO from(Contest c, java.util.List<CategoryDTO> categories, java.util.List<RoundDTO> rounds) {
        return new ContestDTO(
                c.getId(),
                c.getName(),
                c.getSeason() != null ? c.getSeason().name() : null,
                c.getYear(),
                c.getRegistrationStart(),
                c.getRegistrationEnd(),
                c.getClosedAt(),
                c.getStatus() != null ? c.getStatus().name() : null,
                c.getDescription(),
                c.getRegionScope(),
                c.getMaximumAllowedTeams(),
                c.getComplianceRules(),
                c.getTieredPrizeStructures(),
                categories != null ? categories : java.util.List.of(),
                rounds != null ? rounds : java.util.List.of()
        );
    }
}
