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
        LocalDate developmentStart,
        LocalDate developmentEnd,
        String status,
        String description,
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
                c.getDevelopmentStart(),
                c.getDevelopmentEnd(),
                c.getStatus() != null ? c.getStatus().name() : null,
                c.getDescription(),
                categories != null ? categories : java.util.List.of(),
                rounds != null ? rounds : java.util.List.of()
        );
    }
}
