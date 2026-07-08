package com.fpt.shms.be.dto;

import lombok.Builder;
import lombok.Data;
import java.util.List;

@Data
@Builder
public class EvaluatorDashboardResponse {
    private int assignedTrackCount;
    private int totalAllocatedTeams;
    private int evaluatedCount;

    private List<ContestDto> contests;
    private List<AssignedTeamQueueDto> queue;
    private List<RoundDto> rounds;

    @Data
    @Builder
    public static class RoundDto {
        private Long id;
        private String name;
        private String format;
        private java.time.LocalDateTime gradingOpenAt;
        private java.time.LocalDateTime gradingDeadlineAt;
        private String status;
    }

    @Data
    @Builder
    public static class ContestDto {
        private Long id;
        private String name;
        private String status;
        private String contestStatus;
    }

    @Data
    @Builder
    public static class AssignedTeamQueueDto {
        private Long teamId;
        private Long submissionId;
        private Long roundId;
        private String teamName;
        private String abbreviation;
        private String trackName;
        private String roundName;
        private String submissionState;
        private String themeClass;
        private java.time.LocalDateTime gradingDeadlineAt;
        private String roundFormat;
        private Double score;
    }
}
