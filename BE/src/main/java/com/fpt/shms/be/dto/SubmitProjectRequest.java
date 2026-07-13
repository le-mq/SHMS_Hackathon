package com.fpt.shms.be.dto;

import lombok.Data;

@Data
public class SubmitProjectRequest {

    private Long roundId;
    private Long contestId;
    private String submissionData;
    private String submissionType; // "DRAFT" or "OFFICIAL", defaults to "OFFICIAL"
}
