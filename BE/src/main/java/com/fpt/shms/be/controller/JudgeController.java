package com.fpt.shms.be.controller;

import com.fpt.shms.be.dto.EvaluatorDashboardResponse;
import com.fpt.shms.be.dto.SubmitScoreRequest;
import com.fpt.shms.be.util.JwtUtils;
import io.swagger.v3.oas.annotations.Operation;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.fpt.shms.be.service.JudgeService;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/judge")
@RequiredArgsConstructor
public class JudgeController {

    private final JwtUtils jwtUtils;
    private final JudgeService judgeService;

    @GetMapping("/assigned-submissions")
    @Operation(summary = "Get Assigned Submissions", description = "Returns teams and submissions allocated to the judge.")
    public ResponseEntity<?> getAssignedSubmissions(HttpServletRequest request, 
            @org.springframework.web.bind.annotation.RequestParam(required = false) Long contestId) {
        try {
            String token = jwtUtils.extractToken(request);
            if (token == null || !jwtUtils.validateToken(token)) {
                return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));
            }

            String username = jwtUtils.getUsernameFromToken(token);
            EvaluatorDashboardResponse response = judgeService.getDashboardData(username, contestId);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage() != null ? e.getMessage() : "Unknown error"));
        }
    }

    @GetMapping("/evaluation-data/{teamId}")
    @Operation(summary = "Get Evaluation Data", description = "Returns team submission and rubric.")
    public ResponseEntity<?> getEvaluationData(HttpServletRequest request, @org.springframework.web.bind.annotation.PathVariable Long teamId) {
        try {
            String token = jwtUtils.extractToken(request);
            if (token == null || !jwtUtils.validateToken(token)) {
                return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));
            }

            String username = jwtUtils.getUsernameFromToken(token);
            return ResponseEntity.ok(judgeService.getEvaluationData(username, teamId));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));
        }
    }

    @PostMapping("/submit-score")
    @Operation(summary = "Submit Score", description = "Judge submits scores and feedback for all criteria of a submission.")
    public ResponseEntity<?> submitScore(HttpServletRequest request, @RequestBody SubmitScoreRequest scoreRequest) {
        try {
            String token = jwtUtils.extractToken(request);
            if (token == null || !jwtUtils.validateToken(token)) {
                return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));
            }

            // Validation: Ensure all criteria points are provided
            for (SubmitScoreRequest.ScoreEntry entry : scoreRequest.getScores()) {
                if (entry.getPointsAwarded() == null || entry.getPointsAwarded() < 0 || entry.getPointsAwarded() > 100) {
                    return ResponseEntity.badRequest().body(Map.of("error", "Points must be provided between 0 and 100 for all criteria."));
                }
            }

            String username = jwtUtils.getUsernameFromToken(token);
            judgeService.submitScore(username, scoreRequest);
            
            return ResponseEntity.ok(Map.of("message", "Score submitted successfully and locked."));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/history")
    @Operation(summary = "Get judge's historical evaluation log")
    public ResponseEntity<?> getHistory(HttpServletRequest request) {
        try {
            String token = jwtUtils.extractToken(request);
            if (token == null || !jwtUtils.validateToken(token)) {
                return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));
            }
            String username = jwtUtils.getUsernameFromToken(token);
            return ResponseEntity.ok(judgeService.getHistoricalLog(username));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));
        }
    }
}
