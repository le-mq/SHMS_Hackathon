package com.fpt.shms.be.dto;

import lombok.Data;

@Data
public class EditScoreRequest {
    private Long scoreId;
    private Double newTotalScore;
    private String reason;
}
