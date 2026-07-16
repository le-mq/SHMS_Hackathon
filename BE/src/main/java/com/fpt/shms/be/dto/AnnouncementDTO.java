package com.fpt.shms.be.dto;

import com.fpt.shms.be.model.Announcement;
import java.time.LocalDateTime;

public record AnnouncementDTO(
        Long id,
        String title,
        String content,
        String type,
        LocalDateTime publishedAt,
        java.util.List<String> targetRoles,
        Long creatorId
) {
    public static AnnouncementDTO from(Announcement a) {
        java.util.List<String> rolesList = new java.util.ArrayList<>();
        if (a.getTargets() != null && !a.getTargets().isEmpty()) {
            rolesList = a.getTargets().stream().map(t -> t.getRole().getName()).toList();
        }
        return new AnnouncementDTO(
                a.getId(),
                a.getTitle(),
                a.getContent(),
                a.getType() != null ? a.getType().name() : "INFO",
                a.getPublishedAt(),
                rolesList,
                a.getAdminUser() != null ? a.getAdminUser().getId() : null
        );
    }
}