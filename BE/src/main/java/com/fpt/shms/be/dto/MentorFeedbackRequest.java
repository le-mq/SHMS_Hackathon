package com.fpt.shms.be.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class MentorFeedbackRequest {

    @NotNull(message = "Submission ID is required")
    private Long submissionId;

    @NotBlank(message = "Feedback content is required")
    private String feedbackContent;
}
