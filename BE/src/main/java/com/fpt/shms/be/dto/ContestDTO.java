package com.fpt.shms.be.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.fpt.shms.be.model.Contest;
import java.time.LocalDate;
import java.time.LocalDateTime;

public record ContestDTO(
        Long id,
        String name,
        String season,
        Integer year,
        @JsonFormat(pattern = "yyyy-MM-dd")
        LocalDate registrationStart,
        @JsonFormat(pattern = "yyyy-MM-dd")
        LocalDate registrationEnd,
        @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
        LocalDateTime contestEndAt,
        String status,
        String description,
        Integer maximumAllowedTeams,
        Integer minTeamMembers,
        Integer maxTeamMembers,
        String complianceRules,
        String tieredPrizeStructures,
        String location,
        @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
        LocalDateTime publishedAt,
        @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
        LocalDateTime contestStartAt,
        java.util.List<CategoryDTO> categories,
        java.util.List<RoundDTO> rounds
) {
    public record RoundDTO(
            String phaseName,
            @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
            LocalDateTime submissionOpen,
            @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
            LocalDateTime submissionDeadline,
            @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
            LocalDateTime gradingDeadlineAt,
            @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
            LocalDateTime reviewCalibrationAt,
            @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
            LocalDateTime publishResultAt,
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