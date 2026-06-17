package com.fpt.shms.be.dto;

import com.fpt.shms.be.model.Announcement;

import java.time.LocalDateTime;

/**
 * DTO representing an active announcement for the public home page.
 */
public record AnnouncementDTO(
        Long id,
        String title,
        String content,
        String type,
        LocalDateTime publishedAt
) {
    public static AnnouncementDTO from(Announcement a) {
        return new AnnouncementDTO(
                a.getId(),
                a.getTitle(),
                a.getContent(),
                a.getType() != null ? a.getType().name() : "INFO",
                a.getPublishedAt()
        );
    }
}
