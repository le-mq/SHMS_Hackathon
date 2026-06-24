package com.fpt.shms.be.dto;

import lombok.Data;
import jakarta.validation.constraints.NotNull;

@Data
public class ProcessRankingsRequest {
    @NotNull(message = "Contest ID is required")
    private Long contestId;

    @NotNull(message = "Round ID is required")
    private Long roundId;

    private int topN;
}
