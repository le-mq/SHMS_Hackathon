package com.fpt.shms.be.dto;

import lombok.Data;

@Data
public class TeamRegistrationRequest {
    private String teamName;
    private Long contestId;
    private Long categoryId;
    private String leaderStudentId;
}
