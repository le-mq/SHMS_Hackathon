package com.fpt.shms.be.dto;

import lombok.Builder;
import lombok.Data;
import java.util.List;

@Data
@Builder
public class TeamScoreDetailsResponse {
    private String teamName;
    private String projectName;
    private Double totalScore;
    private String trackName;
    private Integer rank;

    private List<RoundScoreDto> rounds;

    @Data
    @Builder
    public static class RoundScoreDto {
        private Long roundId;
        private String roundName;
        private Double totalScore;
        private Boolean hasSubmission;
        private Boolean isGraded;
        private List<RubricScoreDto> detailedScores;
    }

    @Data
    @Builder
    public static class RubricScoreDto {
        private String criteriaName;
        private Double weight;
        private Double pointsAwarded;
        private String feedback;
    }
}
