package com.fpt.shms.be.dto;

import lombok.Builder;
import lombok.Data;
import java.util.List;

@Data
@Builder
public class ProcessRankingsResponse {
    private Long contestId;
    private String contestName;
    private String roundName;
    private int topN;
    private int qualifiedCount;
    private int eliminatedCount;
    private int totalProcessed;
    private List<TeamRankingEntry> results;

    @Data
    @Builder
    public static class TeamRankingEntry {
        private Long teamId;
        private String teamName;
        private String categoryName;
        private Double averageScore;
        private Integer rank;
        private String status;        // QUALIFIED or ELIMINATED
    }
}
