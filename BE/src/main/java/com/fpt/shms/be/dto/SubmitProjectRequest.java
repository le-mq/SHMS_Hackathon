package com.fpt.shms.be.dto;

import jakarta.validation.constraints.Pattern;
import lombok.Data;

@Data
public class SubmitProjectRequest {

    private Long roundId;

    @Pattern(regexp = "^$|^(https?://)?(www\\.)?github\\.com/.*$", message = "Must be a valid GitHub URL")
    private String githubRepoUrl;

    @Pattern(regexp = "^$|^(https?://).*$", message = "Must be a valid URL starting with http/https")
    private String liveDemoUrl;

    @Pattern(regexp = "^$|^(https?://).*$", message = "Must be a valid URL starting with http/https")
    private String docsUrl;

    @Pattern(regexp = "^$|^(https?://).*$", message = "Must be a valid URL starting with http/https")
    private String slideUrl;
}
