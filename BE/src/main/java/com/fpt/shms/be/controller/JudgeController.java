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
    private final com.fpt.shms.be.service.SubmissionService submissionService;

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
    @PreAuthorize("hasAnyAuthority('JUDGE', 'MENTOR')")
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

    @GetMapping("/result-review")
    @Operation(summary = "Get Result Review Data", description = "Returns score details for all teams the judge has evaluated, available ONLY after admin publishes scores (reviewCalibrationAt).")
    public ResponseEntity<?> getResultReview(HttpServletRequest request,
                                             @org.springframework.web.bind.annotation.RequestParam(required = false) Long contestId) {
        try {
            String username = SecurityContextHolder.getContext().getAuthentication().getName();

            // Gate check: scores are only visible after admin publishes them (reviewCalibrationAt)
            EvaluatorDashboardResponse data = judgeService.getJudgeResultReviewData(username, contestId);

            // Check if at least one round in assigned contests has reviewCalibrationAt set
            boolean scoresPublished = judgeService.areScoresPublished(username, contestId);
            if (!scoresPublished) {
                return ResponseEntity.status(403).body(Map.of(
                        "error", "Scores have not been published yet. Please wait for the admin to publish scores before reviewing.",
                        "code", "SCORES_NOT_PUBLISHED"
                ));
            }

            return ResponseEntity.ok(data);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/team-score-details")
    @Operation(summary = "Get Team Score Details (Judge)", description = "Returns score breakdown for an evaluated team after scores are published (reviewCalibrationAt).")
    public ResponseEntity<?> getTeamScoreDetails(HttpServletRequest request,
                                                 @org.springframework.web.bind.annotation.RequestParam Long teamId) {
        try {
            String username = SecurityContextHolder.getContext().getAuthentication().getName();
            return ResponseEntity.ok(submissionService.getTeamScoreDetailsByTeam(username, teamId, "JUDGE"));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", "Internal Error: " + e.getMessage()));
        }
    }
}
