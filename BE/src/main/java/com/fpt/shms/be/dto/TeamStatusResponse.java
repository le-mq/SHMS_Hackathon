package com.fpt.shms.be.dto;

import lombok.Builder;
import lombok.Data;
import java.util.List;

@Data
@Builder
public class TeamStatusResponse {
    private Long teamId;
    private String teamName;
    private String categoryName;
    private String status;
    private Integer maxMembers;
    private Long currentTotalMembers;
    private List<MemberDto> roster;

    @Data
    @Builder
    public static class MemberDto {
        private String fullName;
        private String studentId;
        private String email;
        private String internalRole; // "LEADER", "MEMBER"
        private String status;
        private String universityName;
    }
}
