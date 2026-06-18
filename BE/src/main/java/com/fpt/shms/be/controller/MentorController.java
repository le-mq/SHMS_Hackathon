package com.fpt.shms.be.controller;

import com.fpt.shms.be.dto.MentorTrackResponse;
import com.fpt.shms.be.dto.UpdateProfileRequest;
import com.fpt.shms.be.service.MentorService;
import com.fpt.shms.be.service.UserService;
import com.fpt.shms.be.util.JwtUtils;
import io.swagger.v3.oas.annotations.Operation;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/mentor")
@RequiredArgsConstructor
public class MentorController {

    private final JwtUtils jwtUtils;
    private final MentorService mentorService;
    private final UserService userService;
    
    @GetMapping("/assigned-teams")
    @Operation(summary = "Get Assigned Teams", description = "Returns overview statistics and allocated teams for the mentor.")
    public ResponseEntity<?> getAssignedTeams(HttpServletRequest request) {
        try {
            String token = jwtUtils.extractToken(request);
            if (token == null || !jwtUtils.validateToken(token)) {
                return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));
            }
            String username = jwtUtils.getUsernameFromToken(token);
            MentorTrackResponse response = mentorService.getAssignedTeams(username);

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
    @Operation(summary = "Update Mentor Profile", description = "Updates allowed fields (Telephone, Password, Avatar).")
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
