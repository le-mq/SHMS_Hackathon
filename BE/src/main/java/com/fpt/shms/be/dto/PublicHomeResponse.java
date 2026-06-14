package com.fpt.shms.be.dto;

import java.util.List;
import java.util.Map;

/**
 * Aggregated response payload for GET /api/v1/public/home.
 *
 * @param contests      Active / upcoming seasonal hackathons
 * @param tracks        Open / coming-soon competitive tracks
// * @param announcements Latest active announcements
// * @param stats         Contest count grouped by status for chart visualisation
 */
public record PublicHomeResponse(
        List<ContestDTO>       contests,
        List<TrackDTO>         tracks,
//        List<AnnouncementDTO>  announcements,
//        Map<String, Long>      stats,
        List<String>           universities,
        List<String>           geographicScopes
) {}
