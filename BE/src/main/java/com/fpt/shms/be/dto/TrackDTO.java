package com.fpt.shms.be.dto;

import com.fpt.shms.be.model.Category;

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
