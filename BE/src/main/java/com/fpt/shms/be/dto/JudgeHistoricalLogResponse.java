package com.fpt.shms.be.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class JudgeHistoricalLogResponse {
    private List<Record> records;

    @Data
    @Builder
    public static class Record {
        private String teamName;
        private String teamId;
        private String timestamp;
        private String roundStatus;
        private Double totalScore;
        private List<ScoreDetail> details;
    }

    @Data
    @Builder
    public static class ScoreDetail {
        private String criteriaName;
        private Double pointsAwarded;
        private String feedback;
    }
}
