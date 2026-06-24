package com.fpt.shms.be.dto;

import lombok.Data;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

@Data
public class ProcessRankingsRequest {
    @NotNull(message = "Contest ID is required")
    private Long contestId;

    private Long categoryId;

    @NotBlank(message = "Round is required")
    private String round;

    private int topN;
}
