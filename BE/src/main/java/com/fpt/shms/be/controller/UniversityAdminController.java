package com.fpt.shms.be.controller;

import com.fpt.shms.be.dto.StudentVerificationDataDto;
import com.fpt.shms.be.dto.UniversityDto;
import com.fpt.shms.be.service.PartnerAdminService;
import com.fpt.shms.be.util.JwtUtils;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/admin/universities")
@RequiredArgsConstructor
@Tag(name = "University Admin", description = "Admin University/Partner Verification Settings APIs")
public class UniversityAdminController {

    private final PartnerAdminService partnerAdminService;
    private final JwtUtils jwtUtils;

    private void requireAdminOrCoordinatorRole(HttpServletRequest request) {
        String header = request.getHeader("Authorization");
        if (header == null || !header.startsWith("Bearer ")) {
            throw new IllegalArgumentException("Missing or invalid Authorization header");
        }
        String token = header.substring(7);
        String role = jwtUtils.extractRole(token);

        if (role == null || (!role.equals("ADMIN") && !role.equals("COORDINATOR"))) {
            throw new SecurityException("Access Denied: Requires ADMIN role");
        }
    }

    @GetMapping
    @Operation(summary = "Get all Universities", description = "Requires ADMIN role.")
    public ResponseEntity<?> getAllUniversities(HttpServletRequest request) {
        try {
            requireAdminOrCoordinatorRole(request);
            List<UniversityDto> universities = partnerAdminService.getAllUniversities();
            return ResponseEntity.ok(universities);
        } catch (SecurityException e) {
            return ResponseEntity.status(403).body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));
        }
    }

    @PostMapping
    @Operation(summary = "Save/Update all Universities", description = "Requires ADMIN or COORDINATOR role.")
    public ResponseEntity<?> saveAllUniversities(HttpServletRequest request, @Valid @RequestBody List<UniversityDto> universities) {
        try {
            requireAdminOrCoordinatorRole(request);
            partnerAdminService.saveAllUniversities(universities);
            return ResponseEntity.ok(Map.of("message", "University verification protocols updated successfully"));
        } catch (SecurityException e) {
            return ResponseEntity.status(403).body(Map.of("error", e.getMessage()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(400).body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", "Internal Error: " + e.getMessage()));
        }
    }

    @GetMapping("/students")
    @Operation(summary = "Get Student Verification Data for a University", description = "Requires ADMIN role.")
    public ResponseEntity<?> getStudentVerificationData(HttpServletRequest request, @RequestParam String university) {
        try {
            requireAdminOrCoordinatorRole(request);
            List<StudentVerificationDataDto> students = partnerAdminService.getStudentVerificationData(university);
            return ResponseEntity.ok(students);
        } catch (SecurityException e) {
            return ResponseEntity.status(403).body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", "Internal Error: " + e.getMessage()));
        }
    }

    @PostMapping("/students")
    @Operation(summary = "Save Student Verification Data for a University", description = "Requires ADMIN or COORDINATOR role.")
    public ResponseEntity<?> saveStudentVerificationData(HttpServletRequest request, @RequestParam String university, @RequestBody List<StudentVerificationDataDto> students) {
        try {
            requireAdminOrCoordinatorRole(request);
            partnerAdminService.saveStudentVerificationData(university, students);
            return ResponseEntity.ok(Map.of("message", "Student verification data updated successfully"));
        } catch (SecurityException e) {
            return ResponseEntity.status(403).body(Map.of("error", e.getMessage()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(400).body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", "Internal Error: " + e.getMessage()));
        }
    }

}
