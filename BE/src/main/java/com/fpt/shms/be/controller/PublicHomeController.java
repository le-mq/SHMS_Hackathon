package com.fpt.shms.be.controller;

import com.fpt.shms.be.dto.PublicHomeResponse;
import com.fpt.shms.be.service.PublicHomeService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Public REST endpoints — no authentication required.
 */
@RestController
@RequestMapping("/api/v1/public")
@RequiredArgsConstructor
@Tag(name = "Public", description = "Publicly accessible endpoints (no auth required)")
public class PublicHomeController {

    private final PublicHomeService publicHomeService;

    /**
     * GET /api/v1/public/home
     * <p>
     * Returns the aggregated data needed to render the public home page:
     * <ul>
     *   <li>Active / upcoming contests (seasonal hackathons)</li>
     *   <li>Open competitive tracks</li>
     *   <li>Active announcements</li>
     *   <li>Contest statistics map for Chart.js</li>
     * </ul>
     */
    @GetMapping("/home")
    @Operation(
            summary     = "Get public home page data",
            description = "Returns contests, tracks, announcements and stats for the public-facing home page."
    )
    public ResponseEntity<PublicHomeResponse> getHome() {
        return ResponseEntity.ok(publicHomeService.getHomeData());
    }

    @GetMapping("/universities")
    @Operation(summary = "Get list of universities", description = "Returns all available universities with their validation rules")
    public ResponseEntity<java.util.List<com.fpt.shms.be.dto.UniversityDto>> getUniversities() {
        return ResponseEntity.ok(publicHomeService.getUniversitiesDetailed());
    }

    @GetMapping("/leaderboards")
    @Operation(summary = "Get published leaderboards")
    public ResponseEntity<?> getPublishedLeaderboards() {
        return ResponseEntity.ok(publicHomeService.getPublishedLeaderboards());
    }

    @GetMapping("/announcements")
    @Operation(summary = "Get active announcements")
    public ResponseEntity<?> getAnnouncements() {
        return ResponseEntity.ok(publicHomeService.getAnnouncements());
    }
}
