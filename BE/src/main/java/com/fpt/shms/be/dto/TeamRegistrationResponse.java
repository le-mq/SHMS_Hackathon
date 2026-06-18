package com.fpt.shms.be.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TeamRegistrationResponse {
    private String status;
    private String message;
    private String newToken;

    public TeamRegistrationResponse(String status, String message) {
        this.status = status;
        this.message = message;
    }
}
