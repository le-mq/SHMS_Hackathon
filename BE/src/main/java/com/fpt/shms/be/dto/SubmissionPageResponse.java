package com.fpt.shms.be.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
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
        @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
        private LocalDateTime submissionOpen;
        @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
        private LocalDateTime submissionDeadline;
        @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
        private LocalDateTime gradingDeadlineAt;
        @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
        private LocalDateTime publishResultAt;
        private Boolean eligible;
        private String lockedReason;
        private Boolean evaluated;
        private Double totalScore;
        private String submissionRequirements;
        private String roundFormat;
    }

    @Data
    @Builder
    public static class HistoryDto {
        private Long roundId;
        private Integer version;
        @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
        private LocalDateTime timestamp;
        private String status;
        private String submissionData;
        private Boolean evaluated;
        private Double totalScore;
        private String mentorFeedback;
        private String mentorName;
        private String judgeFeedback;
    }
}