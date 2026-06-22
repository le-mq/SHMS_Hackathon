package com.fpt.shms.be.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.List;

@Data
public class ExpertAllocationRequest {

    @NotNull(message = "User ID is required")
    private Long userId;

    @NotNull(message = "Round ID is required")
    private Long roundId;

    private List<TrackAssignment> assignments;

    @Data
    public static class TrackAssignment {
        private Long trackId;
        private Boolean isJudge;
        private List<Long> mentoredTeamIds;
    }
}
