package com.fpt.shms.be.dto;

import lombok.Builder;
import lombok.Data;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
public class WorkspaceResponse {
    private String teamStatus;
    private LocalDateTime submissionDeadline;
    private int currentMembers;
    private int maxMembers;
    private boolean isSubmitted;
    private Integer currentRank;
    private List<AnnouncementDto> announcements;

    @Data
    @Builder
    public static class AnnouncementDto {
        private Long id;
        private String title;
        private String subtitle;
        private String category;
        private LocalDateTime datePosted;
    }
}
