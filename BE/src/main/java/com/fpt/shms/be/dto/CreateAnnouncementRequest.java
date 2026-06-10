package com.fpt.shms.be.dto;

import com.fpt.shms.be.model.Announcement;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.List;

@Data
public class CreateAnnouncementRequest {
    @NotNull(message = "Contest ID is required")
    private Long contestId;

    @NotBlank(message = "Title is required")
    private String title;

    @NotBlank(message = "Content is required")
    private String content;

    @NotNull(message = "Type is required")
    private Announcement.AnnouncementType type;

    private List<String> roles; // Optional if we want to filter, but for now we store for all
}
