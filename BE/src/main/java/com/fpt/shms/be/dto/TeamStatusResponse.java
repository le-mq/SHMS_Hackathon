package com.fpt.shms.be.dto;

import lombok.Builder;
import lombok.Data;
import java.util.List;

@Data
@Builder
public class TeamStatusResponse {
    private String teamName;
    private String categoryName;
    private String invitationCode;
    private String status;
    private List<MemberDto> roster;

    @Data
    @Builder
    public static class MemberDto {
        private String fullName;
        private String studentId;
        private String email;
        private String internalRole; // "LEADER", "MEMBER"
    }
}
