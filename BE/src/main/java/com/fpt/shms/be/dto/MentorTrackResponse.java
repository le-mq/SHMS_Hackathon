package com.fpt.shms.be.dto;

import lombok.Builder;
import lombok.Data;
import java.util.List;

@Data
@Builder
public class MentorTrackResponse {
    private Long contestId;
    private String contestName;
    private List<TrackOverviewDto> trackOverviews;
    private List<AssignedTeamDto> allocatedTeams;

    @Data
    @Builder
    public static class TrackOverviewDto {
        private Long trackId;
        private String trackName;
        private int assignedTeams;
        private int activeSessions;
        private int completionPercentage;
        private String feedbackDeadline;
        private String targetRoundState;
        private Long targetRoundId;
    }

    @Data
    @Builder
    public static class AssignedTeamDto {
        private Long teamId;
        private String teamName;
        private String trackName;
        private String leaderName;
        private int totalMembers;
        private String progressStatus;
        private String githubRepoUrl;
        private String liveDemoUrl;
        private String docsUrl;
        private String slideUrl;
        private Long roundId;
        private String roundName;
        private Long submissionId;
        private boolean canGiveFeedback;
        private boolean hasGivenFeedback;
        private String mentorFeedback;
    }
}
