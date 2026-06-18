package com.fpt.shms.be.dto;

import lombok.Builder;
import lombok.Data;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
public class SubmissionPageResponse {
    private String internalRole;
    private String contestName;
    private String contestStatus;
    private List<RoundDto> rounds;
    private List<HistoryDto> history;

    @Data
    @Builder
    public static class RoundDto {
        private Long id;
        private String name;
        private String status;
    }

    @Data
    @Builder
    public static class HistoryDto {
        private Long roundId;
        private Integer version;
        private LocalDateTime timestamp;
        private String status;
        private String githubRepoUrl;
        private String liveDemoUrl;
        private String docsUrl;
        private String slideUrl;
    }
}
