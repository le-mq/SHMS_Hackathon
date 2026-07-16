package com.fpt.shms.be.controller;

import com.fpt.shms.be.dto.MentorTrackResponse;
import com.fpt.shms.be.dto.UpdateProfileRequest;
import com.fpt.shms.be.service.MentorService;
import com.fpt.shms.be.service.SubmissionService;
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
@RequestMapping("/api/v1/mentor")
@PreAuthorize("hasAuthority('MENTOR')")
@Tag(name = "Mentor", description = "Mentor Management APIs")
@RequiredArgsConstructor
public class MentorController {

    private final MentorService mentorService;
    private final UserService userService;
    private final SubmissionService submissionService;

    @GetMapping("/assigned-teams")
    @Operation(summary = "Get Assigned Teams", description = "Returns overview statistics and allocated teams for the mentor.")
    public ResponseEntity<?> getAssignedTeams(HttpServletRequest request) {
        try {
            String username = SecurityContextHolder.getContext().getAuthentication().getName();
            java.util.List<MentorTrackResponse> response = mentorService.getAssignedTeams(username);

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body(Map.of("error", "Internal Error: " + e.getMessage()));
        }
    }

    @GetMapping("/profile")
    @Operation(summary = "Get Mentor Profile", description = "Retrieves the profile of the currently authenticated mentor.")
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
    @Operation(summary = "Update Mentor Profile", description = "Updates allowed fields (Telephone, Password, Avatar).")
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

    @PostMapping("/feedbacks")
    @Operation(summary = "Submit Mentor Feedback", description = "Mentor submits feedback on a DRAFT submission for their assigned team.")
    public ResponseEntity<?> submitFeedback(HttpServletRequest request,
                                            @RequestBody com.fpt.shms.be.dto.MentorFeedbackRequest feedbackRequest) {
        try {
            String username = SecurityContextHolder.getContext().getAuthentication().getName();
            var result = mentorService.submitFeedback(feedbackRequest, username);
            return ResponseEntity.ok(result);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", "Internal Error: " + e.getMessage()));
        }
    }

    @GetMapping("/team-score-details")
    @Operation(summary = "Get Team Score Details (Mentor)", description = "Returns score breakdown for an assigned team after scores are published (reviewCalibrationAt).")
    public ResponseEntity<?> getTeamScoreDetails(HttpServletRequest request,
                                                 @org.springframework.web.bind.annotation.RequestParam Long teamId) {
        try {
            String username = SecurityContextHolder.getContext().getAuthentication().getName();
            return ResponseEntity.ok(submissionService.getTeamScoreDetailsByTeam(username, teamId, "MENTOR"));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", "Internal Error: " + e.getMessage()));
        }
    }
}