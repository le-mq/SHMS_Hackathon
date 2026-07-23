package com.fpt.shms.be.dto;

import lombok.Data;
import java.util.List;

@Data
public class SubmitScoreRequest {
    private Long submissionId;
    private Long teamId;
    private Long roundId;
    private List<ScoreEntry> scores;

    @Data
    public static class ScoreEntry {
        private Long criteriaId;
        private Double pointsAwarded;
        private String feedback;
    }
}
