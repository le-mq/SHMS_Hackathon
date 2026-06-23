package com.fpt.shms.be.controller;

import com.fpt.shms.be.dto.StudentVerificationDataDto;
import com.fpt.shms.be.dto.UniversityDto;
import com.fpt.shms.be.service.PartnerAdminService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/admin/universities")
@PreAuthorize("hasAuthority('ADMIN')")
@RequiredArgsConstructor
@Tag(name = "University Admin", description = "Admin University/Partner Verification Settings APIs")
public class UniversityAdminController {

    private final PartnerAdminService partnerAdminService;

    @GetMapping
    @Operation(summary = "Get all Universities", description = "Requires ADMIN role.")
    public ResponseEntity<?> getAllUniversities(HttpServletRequest request) {
        try {
            List<UniversityDto> universities = partnerAdminService.getAllUniversities();
            return ResponseEntity.ok(universities);
        } catch (Exception e) {
            return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));
        }
    }

    @PostMapping
    @Operation(summary = "Save/Update all Universities", description = "Requires ADMIN role.")
    public ResponseEntity<?> saveAllUniversities(HttpServletRequest request, @Valid @RequestBody List<UniversityDto> universities) {
        try {
            partnerAdminService.saveAllUniversities(universities);
            return ResponseEntity.ok(Map.of("message", "University verification protocols updated successfully"));
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
            List<StudentVerificationDataDto> students = partnerAdminService.getStudentVerificationData(university);
            return ResponseEntity.ok(students);
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", "Internal Error: " + e.getMessage()));
        }
    }

    @PostMapping("/students")
    @Operation(summary = "Save Student Verification Data for a University", description = "Requires ADMIN role.")
    public ResponseEntity<?> saveStudentVerificationData(HttpServletRequest request, @RequestParam String university, @RequestBody List<StudentVerificationDataDto> students) {
        try {
            partnerAdminService.saveStudentVerificationData(university, students);
            return ResponseEntity.ok(Map.of("message", "Student verification data updated successfully"));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(400).body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", "Internal Error: " + e.getMessage()));
        }
    }
}