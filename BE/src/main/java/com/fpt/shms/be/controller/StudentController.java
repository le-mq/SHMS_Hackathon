package com.fpt.shms.be.controller;
import com.fpt.shms.be.dto.ProfileResponse;
import com.fpt.shms.be.dto.UpdateProfileRequest;
import com.fpt.shms.be.service.StudentService;
import com.fpt.shms.be.util.JwtUtils;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/student")
@RequiredArgsConstructor
@Tag(name = "Student", description = "Student Profile APIs")
public class StudentController {

    private final StudentService studentService;
    private final JwtUtils jwtUtils;

    private String extractUsernameFromToken(HttpServletRequest request) {
        String header = request.getHeader("Authorization");
        if (header == null || !header.startsWith("Bearer ")) {
            throw new IllegalArgumentException("Missing or invalid Authorization header");
        }
        String token = header.substring(7);
        return jwtUtils.extractUsername(token);
    }

    private String extractRoleFromToken(HttpServletRequest request) {
        String header = request.getHeader("Authorization");
        String token = header.substring(7);
        return jwtUtils.extractRole(token);
    }
    @GetMapping("/profile")
    @Operation(summary = "Get Student Profile", description = "Retrieves the profile of the currently authenticated student.")
    public ResponseEntity<?> getProfile(HttpServletRequest request) {
        try {
            String username = extractUsernameFromToken(request);
            String role = extractRoleFromToken(request);
            ProfileResponse profile = studentService.getProfile(username, role);
            return ResponseEntity.ok(profile);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));
        }
    }

    @PutMapping("/profile")
    @Operation(summary = "Update Student Profile", description = "Updates allowed fields (Telephone, Password, Avatar). Core identity fields are protected.")
    public ResponseEntity<?> updateProfile(HttpServletRequest request, @RequestBody UpdateProfileRequest updateRequest) {
        try {
            String username = extractUsernameFromToken(request);
            studentService.updateProfile(username, updateRequest);
            return ResponseEntity.ok(Map.of("message", "Profile updated successfully"));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));
        }
    }

    @DeleteMapping("/profile")
    @Operation(summary = "Delete Student Profile", description = "Deletes the currently authenticated student account.")
    public ResponseEntity<?> deleteProfile(HttpServletRequest request) {
        try {
            String username = extractUsernameFromToken(request);
            studentService.deleteProfile(username);
            return ResponseEntity.ok(Map.of("message", "Profile deleted successfully"));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));
        }
    }
}
