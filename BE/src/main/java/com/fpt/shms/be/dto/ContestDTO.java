package com.fpt.shms.be.dto;

import com.fpt.shms.be.model.Contest;
import java.time.LocalDate;

public record ContestDTO(
        Long id,
        String name,
        String season,
        Integer year,
        LocalDate registrationStart,
        LocalDate registrationEnd,
        java.time.LocalDateTime contestEndAt,
        String status,
        String description,
        String regionScope,
        Integer maximumAllowedTeams,
        Integer minTeamMembers,
        Integer maxTeamMembers,
        String complianceRules,
        String tieredPrizeStructures,
        String location,
        java.time.LocalDateTime publishedAt,
        java.time.LocalDateTime contestStartAt,
        java.util.List<CategoryDTO> categories,
        java.util.List<RoundDTO> rounds
) {
    public record RoundDTO(
            String phaseName,
            java.time.LocalDateTime submissionOpen,
            java.time.LocalDateTime submissionDeadline,
            java.time.LocalDateTime gradingDeadlineAt,
            java.time.LocalDateTime publishResultAt,
            String submissionRequirements,
            String roundFormat
    ) {}

    public record CategoryDTO(Long id, String name, String description, String guidelineUrl, java.util.List<RoundDTO> rounds) {}

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
                c.getContestEndAt(),
                c.getStatus() != null ? c.getStatus().name() : null,
                c.getDescription(),
                c.getRegionScope(),
                c.getMaximumAllowedTeams(),
                c.getMinTeamMembers(),
                c.getMaxTeamMembers(),
                c.getComplianceRules(),
                c.getTieredPrizeStructures(),
                c.getLocation(),
                c.getPublishedAt(),
                c.getContestStartAt(),
                categories != null ? categories : java.util.List.of(),
                rounds != null ? rounds : java.util.List.of()
        );
    }
}