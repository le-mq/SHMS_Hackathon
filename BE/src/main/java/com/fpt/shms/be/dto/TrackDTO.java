package com.fpt.shms.be.dto;

import com.fpt.shms.be.model.Category;

/**
 * DTO representing an open competitive track for the public home page.
 */
public record TrackDTO(
        Long id,
        String name,
        String category,
        String status
) {
    public static TrackDTO from(Category t) {
        return new TrackDTO(
                t.getId(),
                t.getName(),
                t.getDescription(),
                t.getStatus() != null ? t.getStatus() : "OPEN"
        );
    }
}
