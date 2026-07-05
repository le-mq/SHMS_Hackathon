package com.fpt.shms.be.controller;

import com.fpt.shms.be.dto.EvaluatorDashboardResponse;
import com.fpt.shms.be.dto.SubmitScoreRequest;
import com.fpt.shms.be.dto.UpdateProfileRequest;
import com.fpt.shms.be.service.JudgeService;
import com.fpt.shms.be.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/judge")
@PreAuthorize("hasAuthority('JUDGE')")
@Tag(name = "Jugde", description = "Judge Management APIs")
@RequiredArgsConstructor
public class JudgeController {

    private final JudgeService judgeService;
    private final UserService userService;

    @GetMapping("/assigned-submissions")
    @Operation(summary = "Get Assigned Submissions", description = "Returns teams and submissions allocated to the judge.")
    public ResponseEntity<?> getAssignedSubmissions(HttpServletRequest request,
                                                    @org.springframework.web.bind.annotation.RequestParam(required = false) Long contestId) {
        try {
            String username = SecurityContextHolder.getContext().getAuthentication().getName();
            EvaluatorDashboardResponse response = judgeService.getDashboardData(username, contestId);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage() != null ? e.getMessage() : "Unknown error"));
        }
    }

    @GetMapping("/evaluation-data/{teamId}")
    @Operation(summary = "Get Evaluation Data", description = "Returns team submission and rubric.")
    public ResponseEntity<?> getEvaluationData(HttpServletRequest request,
                                               @org.springframework.web.bind.annotation.PathVariable Long teamId,
                                               @org.springframework.web.bind.annotation.RequestParam(required = false) Long roundId) {
        try {
            String username = SecurityContextHolder.getContext().getAuthentication().getName();
            return ResponseEntity.ok(judgeService.getEvaluationData(username, teamId, roundId));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));
        }
    }


    @GetMapping("/profile")
    @Operation(summary = "Get Judge Profile", description = "Retrieves the profile of the currently authenticated judge.")
    public ResponseEntity<?> getProfile(HttpServletRequest request) {
        try {
            String username = SecurityContextHolder.getContext().getAuthentication().getName();
            return ResponseEntity.ok(userService.getUserProfile(username));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));
        }
    }

    @PutMapping("/profile")
    @Operation(summary = "Update Judge Profile", description = "Updates allowed fields (Telephone, Password, Avatar).")
    public ResponseEntity<?> updateProfile(HttpServletRequest request, @RequestBody UpdateProfileRequest updateRequest) {
        try {
            String username = SecurityContextHolder.getContext().getAuthentication().getName();
            userService.updateUserProfile(username, updateRequest);
            return ResponseEntity.ok(Map.of("message", "Profile updated successfully"));
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
            for (SubmitScoreRequest.ScoreEntry entry : scoreRequest.getScores()) {
                if (entry.getPointsAwarded() == null || entry.getPointsAwarded() < 0 || entry.getPointsAwarded() > 100) {
                    return ResponseEntity.badRequest().body(Map.of("error", "Points must be provided between 0 and 100 for all criteria."));
                }
            }

            String username = SecurityContextHolder.getContext().getAuthentication().getName();
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
            String username = SecurityContextHolder.getContext().getAuthentication().getName();
            return ResponseEntity.ok(judgeService.getHistoricalLog(username));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));
        }
    }
}