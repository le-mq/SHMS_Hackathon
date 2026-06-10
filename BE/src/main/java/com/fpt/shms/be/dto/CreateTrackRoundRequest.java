package com.fpt.shms.be.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
public class CreateTrackRoundRequest {

    @NotNull(message = "Contest ID is required")
    private Long contestId;

    @NotBlank(message = "Category name is required")
    private String categoryName;

    @NotBlank(message = "Track description is required")
    private String trackDescription;

    private String guidelineUrl;

    @Valid
    private List<RoundDto> rounds;

    @Data
    public static class RoundDto {
        private Long id;

        @NotBlank(message = "Phase name is required")
        private String phaseName;

        @NotNull(message = "Submission open time is required")
        private LocalDateTime submissionOpen;

        @NotNull(message = "Submission deadline is required")
        private LocalDateTime submissionDeadline;
        
        private String submissionFormat = "PDF"; // Default or allow from UI

        private String state = "UPCOMING";
    }
}
