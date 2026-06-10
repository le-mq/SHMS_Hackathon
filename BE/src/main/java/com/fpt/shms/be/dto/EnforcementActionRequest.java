package com.fpt.shms.be.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class EnforcementActionRequest {

    @NotBlank(message = "Target team/entity ID is required")
    private String targetEntityId;

    @NotBlank(message = "Action type is required")
    private String actionType; // DISQUALIFICATION, SCORE_REVOCATION, etc.

    /**
     * BR-AUD-01: Justification is mandatory for all enforcement actions.
     * Minimum 20 characters to prevent trivial/placeholder text.
     */
    @NotBlank(message = "Justification reason is required (BR-AUD-01)")
    @Size(min = 20, message = "Justification must be at least 20 characters to ensure meaningful documentation")
    private String justificationReason;
}
