package com.fpt.shms.be.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.List;

@Data
public class CreateRubricRequest {

    @NotBlank(message = "Template name is required")
    private String name;

    private String description;

    private Boolean publicVisibility = true;
    private Boolean weightedScoring = true;

    private Long categoryId;

    private Long roundId;

    @NotEmpty(message = "At least one criterion is required")
    @Valid
    private List<CriterionDto> criteria;

    @Data
    public static class CriterionDto {
        @NotBlank(message = "Criteria name is required")
        private String criteriaName;

        private String description;

        @NotNull(message = "Max score is required")
        private Double maxScore;

        @NotNull(message = "Percentage weight is required")
        private Double percentageWeight;
    }
}
