package com.fpt.shms.be.dto;

import lombok.Builder;
import lombok.Data;
import java.util.List;

@Data
@Builder
public class RoundProgressResponse {
    private String roundStatus;
    private String timeRemaining;
    private int totalTeams;
    private int submittedCount;
    private int awaitingCount;
    private int notSubmittedCount;
    private String submissionRequirements;
    private List<TeamProgressDto> teams;

    @Data
    @Builder
    public static class TeamProgressDto {
        private Long teamId;
        private String teamName;
        private String teamStatus;
        private String submissionState;
        private String submissionData;
        private String submissionRequirements;
        private String submittedAt;
    }
}
