package com.fpt.shms.be.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class EvaluationDataResponse {
    private Long submissionId;
    private String submissionData;
    private String projectId;
    private String teamName;
    private String status;
    private String submissionRequirements;
    private String contestName;
    private String contestTheme;
    private String contestLocation;
    private String contestRules;
    private java.time.LocalDateTime contestStart;
    private java.time.LocalDateTime contestEnd;
    private List<com.fpt.shms.be.dto.EvaluatorDashboardResponse.RoundDto> rounds;
    private List<CriteriaDto> criteria;

    @Data
    @Builder
    public static class CriteriaDto {
        private Long id;
        private String name;
        private String description;
        private Integer weight;
    }
}
