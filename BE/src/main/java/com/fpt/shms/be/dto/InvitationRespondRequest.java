package com.fpt.shms.be.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class InvitationRespondRequest {

    @NotBlank(message = "Invitation token is required")
    private String invitationToken;

    @NotBlank(message = "Action is required (ACCEPT or REJECT)")
    private String action; // "ACCEPT" or "REJECT"
}
