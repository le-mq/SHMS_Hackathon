package com.fpt.shms.be.dto;

import lombok.Data;

@Data
public class ReevaluationRequest {
    private Long teamId;
    private Long roundId;
    private String reason;
}
