package com.fpt.shms.be.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class JoinTeamRequest {

    @NotBlank(message = "Invitation code is required")
    private String invitationCode;
}
