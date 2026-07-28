package com.fpt.shms.be.dto;

import java.util.List;

public record PublicHomeResponse(
        List<ContestDTO> contests,
        List<TrackDTO> tracks,
        List<String> universities,
        List<String> geographicScopes) {
}
