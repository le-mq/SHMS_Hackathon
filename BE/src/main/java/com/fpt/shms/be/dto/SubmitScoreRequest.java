package com.fpt.shms.be.dto;

import lombok.Data;
import java.util.List;

@Data
public class SubmitScoreRequest {
    private Long submissionId;
    private List<ScoreEntry> scores;

    @Data
    public static class ScoreEntry {
        private Long criteriaId;
        private Double pointsAwarded; // 0 to 100
        private String feedback;
    }
}
