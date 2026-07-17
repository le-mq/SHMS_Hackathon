package com.fpt.shms.be.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TeamRegistrationResponse {
    private String status;
    private String message;
    private String newToken;
    private List<IneligibleMemberDto> ineligibleMembers;

    public TeamRegistrationResponse(String status, String message) {
        this.status = status;
        this.message = message;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class IneligibleMemberDto {
        private String fullName;
        private String studentCode;
        private String reason;
    }
}
