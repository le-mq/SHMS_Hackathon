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
public class TeamRegistrationDashboardResponse {
    private List<ContestData> contests;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ContestData {
        private Long id;
        private String name;
        private int pendingReview;
        private int approved;
        private int rejectedAndCancelled;
        private int totalParticipants;
        private List<CategoryCapacity> capacities;
        private List<TeamData> teams;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CategoryCapacity {
        private String categoryName;
        private int percentage;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TeamData {
        private Long id;
        private String name;
        private String track;
        private String trackClass;
        private String date;
        private String status;
    }

}
