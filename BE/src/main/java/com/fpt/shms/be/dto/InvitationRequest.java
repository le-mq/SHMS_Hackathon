package com.fpt.shms.be.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class InvitationRequest {

    @NotNull(message = "Team ID is required")
    private Long teamId;

    @NotNull(message = "Student user ID is required")
    private Long studentUserId;
}
