package com.fpt.shms.be.dto;

import lombok.Data;

@Data
public class ProcessRankingsRequest {
    private Long contestId;
    private String round;
    private int topN;
}
