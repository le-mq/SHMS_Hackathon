package com.fpt.shms.be.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class EvaluationDataResponse {
    private Long submissionId;
    private String githubRepoUrl;
    private String liveDemoUrl;
    private String docsUrl;
    private String slideUrl;
    private String projectId;
    private String teamName;
    private String status;
    private String submissionRequirements;
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
