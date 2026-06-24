package com.fpt.shms.be.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class PublishLeaderboardRequest {
    @NotNull(message = "Contest ID is required")
    private Long contestId;

    @NotNull(message = "Round ID is required")
    private Long roundId;

    private int topN;
}
