package com.fpt.shms.be.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class CreateTeamRequest {

    @NotBlank(message = "Team name is required")
    private String teamName;

    private Long categoryId;
}
