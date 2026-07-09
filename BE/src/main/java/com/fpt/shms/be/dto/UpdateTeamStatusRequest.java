package com.fpt.shms.be.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class UpdateTeamStatusRequest {

    private Long teamId;

    @NotBlank
    private String status; // "APPROVED" or "REJECTED"

    private String reason;
}
