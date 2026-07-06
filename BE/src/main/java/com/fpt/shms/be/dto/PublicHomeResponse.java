package com.fpt.shms.be.dto;

import java.util.List;

/**
 * Aggregated response payload for GET /api/v1/public/home.
 *
 * @param contests Active / upcoming seasonal hackathons
 * @param tracks   Open / coming-soon competitive tracks
 *                 visualisation
 */
public record PublicHomeResponse(
        List<ContestDTO> contests,
        List<TrackDTO> tracks,
        List<String> universities,
        List<String> geographicScopes) {
}
