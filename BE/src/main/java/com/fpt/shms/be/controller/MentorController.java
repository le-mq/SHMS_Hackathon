package com.fpt.shms.be.controller;

import com.fpt.shms.be.dto.MentorTrackResponse;
import com.fpt.shms.be.util.JwtUtils;
import io.swagger.v3.oas.annotations.Operation;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import com.fpt.shms.be.service.MentorService;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/mentor")
@RequiredArgsConstructor
public class MentorController {

    private final JwtUtils jwtUtils;
    private final MentorService mentorService;
    
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
}
