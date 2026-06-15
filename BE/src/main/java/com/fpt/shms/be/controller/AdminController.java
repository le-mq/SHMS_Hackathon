package com.fpt.shms.be.controller;

import com.fpt.shms.be.dto.*;
import com.fpt.shms.be.model.Contest;
import com.fpt.shms.be.model.Category;
import com.fpt.shms.be.service.ContestAdminService;
import com.fpt.shms.be.service.ExpertAdminService;
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
@RequestMapping("/api/v1/admin/contests")
@RequiredArgsConstructor
@Tag(name = "Admin", description = "Admin Contest Management APIs")
public class AdminController {

    private final ContestAdminService contestAdminService;
    private final PartnerAdminService partnerAdminService;
    private final ExpertAdminService expertAdminService;
    private final JwtUtils jwtUtils;

    private void requireAdminRole(HttpServletRequest request) {
        String header = request.getHeader("Authorization");
        if (header == null || !header.startsWith("Bearer ")) {
            throw new IllegalArgumentException("Missing or invalid Authorization header");
        }
        String token = header.substring(7);
        String role = jwtUtils.extractRole(token);

        if (role == null || (!role.equals("ADMIN") && !role.equals("COORDINATOR"))) {
            throw new SecurityException("Access Denied: Requires ADMIN");
        }
    }

    @GetMapping
    @Operation(summary = "Get all Hackathon Contests", description = "Requires ADMIN.")
    public ResponseEntity<?> getAllContests(HttpServletRequest request) {
        try {
            requireAdminRole(request);
            // Returns a simple list
            return ResponseEntity.ok(contestAdminService.getAllContests());
        } catch (SecurityException e) {
            return ResponseEntity.status(403).body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));
        }
    }

    @GetMapping("/{contestId}")
    @Operation(summary = "Get Contest details for Admin", description = "Requires ADMIN.")
    public ResponseEntity<?> getContestDetails(HttpServletRequest request, @PathVariable Long contestId) {
        try {
            requireAdminRole(request);
            return ResponseEntity.ok(contestAdminService.getContestDetails(contestId));
        } catch (SecurityException e) {
            return ResponseEntity.status(403).body(Map.of("error", e.getMessage()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(401).body(Map.of("error", "Unauthorized: " + e.getMessage()));
        }
    }

    @PostMapping
    @Operation(summary = "Create a new Hackathon Contest", description = "Requires ADMIN role.")
    public ResponseEntity<?> createContest(HttpServletRequest request, @Valid @RequestBody CreateContestRequest contestRequest) {
        try {
            requireAdminRole(request);
            Contest contest = contestAdminService.createContest(contestRequest);
            return ResponseEntity.ok(Map.of("message", "Contest created successfully", "contestId", contest.getId()));
        } catch (SecurityException e) {
            return ResponseEntity.status(403).body(Map.of("error", e.getMessage()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body(Map.of("error", "Internal Error: " + e.getMessage()));
        }
    }

    @PostMapping("/rounds-tracks")
    @Operation(summary = "Create a Track and configure its Tournament Rounds", description = "Requires ADMIN role.")
    public ResponseEntity<?> createTrackAndRounds(HttpServletRequest request, @Valid @RequestBody CreateTrackRoundRequest trackRequest) {
        try {
            requireAdminRole(request);
            Category category = contestAdminService.createTrackAndRounds(trackRequest);
            return ResponseEntity.ok(Map.of("message", "Track and rounds configured successfully", "categoryId", category.getId()));
        } catch (SecurityException e) {
            return ResponseEntity.status(403).body(Map.of("error", e.getMessage()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body(Map.of("error", "Internal Error: " + e.getMessage()));
        }
    }

    @GetMapping("/{contestId}/partners")
    @Operation(summary = "Get Partner Universities for a Contest", description = "Requires ADMIN role.")
    public ResponseEntity<?> getPartnersByContest(HttpServletRequest request, @PathVariable Long contestId) {
        try {
            requireAdminRole(request);
            List<UniversityDto> partners = partnerAdminService.getPartnersByContest(contestId);
            return ResponseEntity.ok(partners);
        } catch (SecurityException e) {
            return ResponseEntity.status(403).body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));
        }
    }

    @PostMapping("/{contestId}/partners")
    @Operation(summary = "Configure Partner Universities for a Contest", description = "Requires ADMIN role.")
    public ResponseEntity<?> configurePartnersForContest(HttpServletRequest request, @PathVariable Long contestId, @Valid @RequestBody List<UniversityDto> partners) {
        try {
            requireAdminRole(request);
            partnerAdminService.savePartnersForContest(contestId, partners);
            return ResponseEntity.ok(Map.of("message", "Partner verification rules updated successfully"));
        } catch (SecurityException e) {
            return ResponseEntity.status(403).body(Map.of("error", e.getMessage()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));
        }
    }

    @GetMapping("/{contestId}/partners/students")
    @Operation(summary = "Get Student Validation Data for a Contest's Partner", description = "Requires ADMIN role.")
    public ResponseEntity<?> getStudentValidationData(HttpServletRequest request, @PathVariable Long contestId, @RequestParam String university) {
        try {
            requireAdminRole(request);
            List<StudentVerificationDataDto> students = partnerAdminService.getStudentVerificationData(university);
            return ResponseEntity.ok(students);
        } catch (SecurityException e) {
            return ResponseEntity.status(403).body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", "Internal Error: " + e.getMessage()));
        }
    }

    @PostMapping("/{contestId}/partners/students")
    @Operation(summary = "Save Student Validation Data for a Contest's Partner", description = "Requires ADMIN.")
    public ResponseEntity<?> saveStudentValidationData(HttpServletRequest request, @PathVariable Long contestId, @RequestBody List<StudentVerificationDataDto> students) {
        try {
            requireAdminRole(request);
            partnerAdminService.saveStudentVerificationData(students);
            return ResponseEntity.ok(Map.of("message", "Student verification data updated successfully"));
        } catch (SecurityException e) {
            return ResponseEntity.status(403).body(Map.of("error", e.getMessage()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", "Internal Error: " + e.getMessage()));
        }
    }

    @PostMapping("/experts/create")
    @Operation(summary = "Provision Expert Credentials", description = "Requires ADMIN.")
    public ResponseEntity<?> createExpert(HttpServletRequest request, @Valid @RequestBody CreateExpertRequest expertRequest) {
        try {
            requireAdminRole(request);
            expertAdminService.createExpert(expertRequest);
            return ResponseEntity.ok(Map.of("message", "Expert credentials provisioned successfully"));
        } catch (SecurityException e) {
            return ResponseEntity.status(403).body(Map.of("error", e.getMessage()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));
        }
    }

    @GetMapping("/experts")
    @Operation(summary = "Get all Experts", description = "Requires ADMIN role.")
    public ResponseEntity<?> getAllExperts(HttpServletRequest request) {
        try {
            requireAdminRole(request);
            return ResponseEntity.ok(expertAdminService.getAllExperts());
        } catch (Exception e) {
            return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));
        }
    }

    @PutMapping("/experts/{userId}/expiry")
    @Operation(summary = "Extend Expert Expiry", description = "Requires ADMIN role.")
    public ResponseEntity<?> extendExpertExpiry(HttpServletRequest request, @PathVariable Long userId, @Valid @RequestBody com.fpt.shms.be.dto.ExtendExpiryRequest extendRequest) {
        try {
            requireAdminRole(request);
            expertAdminService.extendExpiry(userId, extendRequest.getNewExpiry());
            return ResponseEntity.ok(Map.of("message", "Expiry extended successfully"));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body(Map.of("error", "Internal Error: " + e.getMessage()));
        }
    }

    @PutMapping("/experts/{userId}/roles")
    @Operation(summary = "Update Expert Roles", description = "Requires ADMIN role.")
    public ResponseEntity<?> updateExpertRoles(HttpServletRequest request, @PathVariable Long userId, @RequestBody java.util.Map<String, java.util.List<String>> rolesMap) {
        try {
            requireAdminRole(request);
            java.util.List<String> roles = rolesMap.get("roles");
            if (roles == null || roles.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Roles cannot be empty"));
            }
            expertAdminService.updateExpertRoles(userId, roles);
            return ResponseEntity.ok(Map.of("message", "Roles updated successfully"));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body(Map.of("error", "Internal Error: " + e.getMessage()));
        }
    }

    @DeleteMapping("/experts/{userId}")
    @Operation(summary = "Delete an Expert", description = "Requires ADMIN role.")
    public ResponseEntity<?> deleteExpert(HttpServletRequest request, @PathVariable Long userId) {
        try {
            requireAdminRole(request);
            expertAdminService.deleteExpert(userId);
            return ResponseEntity.ok(Map.of("message", "Expert deleted successfully"));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body(Map.of("error", "Internal Error: " + e.getMessage()));
        }
    }

}
