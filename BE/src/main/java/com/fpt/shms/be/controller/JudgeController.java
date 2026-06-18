package com.fpt.shms.be.controller;

import com.fpt.shms.be.dto.EvaluatorDashboardResponse;
import com.fpt.shms.be.dto.UpdateProfileRequest;
import com.fpt.shms.be.service.JudgeService;
import com.fpt.shms.be.service.UserService;
import com.fpt.shms.be.util.JwtUtils;
import io.swagger.v3.oas.annotations.Operation;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/judge")
@RequiredArgsConstructor
public class JudgeController {

    private final JwtUtils jwtUtils;
    private final JudgeService judgeService;
    private final UserService userService;

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

    @GetMapping("/profile")
    @Operation(summary = "Get Judge Profile", description = "Retrieves the profile of the currently authenticated judge.")
    public ResponseEntity<?> getProfile(HttpServletRequest request) {
        try {
            String token = jwtUtils.extractToken(request);
            if (token == null || !jwtUtils.validateToken(token)) {
                return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));
            }
            String username = jwtUtils.getUsernameFromToken(token);
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
            String token = jwtUtils.extractToken(request);
            if (token == null || !jwtUtils.validateToken(token)) {
                return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));
            }
            String username = jwtUtils.getUsernameFromToken(token);
            userService.updateUserProfile(username, updateRequest);
            return ResponseEntity.ok(Map.of("message", "Profile updated successfully"));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));
        }
    }

}
