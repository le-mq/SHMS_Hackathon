package com.fpt.shms.be.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class CreateTeamRequest {

    @NotBlank(message = "Team name is required")
    @Size(min = 3, max = 30, message = "Team name must be between 3 and 30 characters")
    @Pattern(
            regexp = "^[\\p{L}\\p{N} _-]+$",
            message = "Team name may only contain letters, numbers, spaces, hyphens (-), and underscores (_)"
    )
    private String teamName;
}