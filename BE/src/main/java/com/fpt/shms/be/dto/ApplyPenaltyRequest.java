package com.fpt.shms.be.dto;

import lombok.Data;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.NotBlank;

@Data
public class ApplyPenaltyRequest {
    @NotNull(message = "Team ID is required")
    private Long teamId;

    @NotBlank(message = "Penalty rule is required")
    private String penaltyRule;

    @NotBlank(message = "Penalty applied is required")
    private String penaltyApplied;

    private String penaltyNote;
}
