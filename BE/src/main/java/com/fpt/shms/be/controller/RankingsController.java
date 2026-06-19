package com.fpt.shms.be.controller;

import com.fpt.shms.be.dto.ProcessRankingsRequest;
import com.fpt.shms.be.dto.ProcessRankingsResponse;
import com.fpt.shms.be.dto.RankingReadinessResponse;
import com.fpt.shms.be.service.RankingAdminService;
import com.fpt.shms.be.util.JwtUtils;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/admin/rankings")
@RequiredArgsConstructor
@Tag(name = "Admin - Rankings", description = "Ranking compilation and promotion APIs")
public class RankingsController {

    private final JwtUtils jwtUtils;
    private final RankingAdminService rankingAdminService;

    @GetMapping("/readiness")
    @Operation(summary = "Get readiness check for ranking generation")
    public ResponseEntity<?> getReadiness(
            HttpServletRequest request,
            @RequestParam Long contestId,
            @RequestParam String roundName) {
        try {
            String token = jwtUtils.extractToken(request);
            if (token == null || !jwtUtils.validateToken(token)) {
                return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));
            }
            String role = jwtUtils.extractRole(token);
            if (!"ADMIN".equals(role)) {
                return ResponseEntity.status(403).body(Map.of("error", "Access denied: ADMIN role required."));
            }

            RankingReadinessResponse readiness = rankingAdminService.getReadiness(contestId, roundName);
            return ResponseEntity.ok(readiness);
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/process")
    @Operation(summary = "Process Rankings & Execute Promotion")
    public ResponseEntity<?> processRankings(
            HttpServletRequest request,
            @RequestBody ProcessRankingsRequest rankingsRequest) {
        try {
            String token = jwtUtils.extractToken(request);
            if (token == null || !jwtUtils.validateToken(token)) {
                return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));
            }

            String role = jwtUtils.extractRole(token);
            if (!"ADMIN".equals(role)) {
                return ResponseEntity.status(403).body(Map.of("error", "Access denied: ADMIN role required."));
            }

            if (rankingsRequest.getTopN() < 1) {
                return ResponseEntity.badRequest().body(Map.of("error", "Top N must be at least 1"));
            }

            ProcessRankingsResponse response = rankingAdminService.processRankings(
                    rankingsRequest.getContestId(),
                    rankingsRequest.getRound(),
                    rankingsRequest.getTopN()
            );

            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(422).body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/publish")
    @Operation(summary = "Publish Results")
    public ResponseEntity<?> publishResults(
            HttpServletRequest request,
            @RequestBody com.fpt.shms.be.dto.PublishLeaderboardRequest publishRequest) {
        try {
            String token = jwtUtils.extractToken(request);
            if (token == null || !jwtUtils.validateToken(token)) {
                return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));
            }

            String role = jwtUtils.extractRole(token);
            if (!"ADMIN".equals(role)) {
                return ResponseEntity.status(403).body(Map.of("error", "Access denied: ADMIN role required."));
            }

            rankingAdminService.publishLeaderboard(publishRequest);

            return ResponseEntity.ok(Map.of("message", "Leaderboard published successfully"));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }
}
