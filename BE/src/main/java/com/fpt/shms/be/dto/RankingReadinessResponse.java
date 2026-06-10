package com.fpt.shms.be.dto;

import lombok.Builder;
import lombok.Data;
import java.util.List;

@Data
@Builder
public class RankingReadinessResponse {
    private Summary summary;
    private List<Evaluator> evaluators;
    private boolean allReady;

    @Data
    @Builder
    public static class Summary {
        private int totalTeams;
        private double avgScore;
        private String scoreRange;
        private List<Integer> bars;
    }

    @Data
    @Builder
    public static class Evaluator {
        private String name;
        private String dept;
        private String status;
        private String date;
    }
}
