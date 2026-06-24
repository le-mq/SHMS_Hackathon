package com.fpt.shms.be.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class PublishLeaderboardRequest {
    @NotNull(message = "Contest ID is required")
    private Long contestId;

    private Long categoryId;

    @NotBlank(message = "Round name is required")
    private String roundName;

    private int topN;
}
