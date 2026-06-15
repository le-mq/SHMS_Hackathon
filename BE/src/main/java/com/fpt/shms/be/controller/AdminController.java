package com.fpt.shms.be.controller;

import com.fpt.shms.be.dto.*;
import com.fpt.shms.be.model.Contest;
import com.fpt.shms.be.model.Category;
import com.fpt.shms.be.model.ContestRubric;
import com.fpt.shms.be.service.ContestAdminService;
import com.fpt.shms.be.service.RubricAdminService;
import com.fpt.shms.be.service.PartnerAdminService;
import com.fpt.shms.be.service.TeamService;
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
    private final RubricAdminService rubricAdminService;
    private final PartnerAdminService partnerAdminService;
    private final TeamService teamService;
    private final JwtUtils jwtUtils;

    private void requireAdminOrCoordinatorRole(HttpServletRequest request) {
        String header = request.getHeader("Authorization");
        if (header == null || !header.startsWith("Bearer ")) {
            throw new IllegalArgumentException("Missing or invalid Authorization header");
        }
        String token = header.substring(7);
        String role = jwtUtils.extractRole(token);

        if (role == null || (!role.equals("ADMIN") && !role.equals("COORDINATOR"))) {
            throw new SecurityException("Access Denied: Requires ADMIN or COORDINATOR role");
        }
    }

    @GetMapping
    @Operation(summary = "Get all Hackathon Contests", description = "Requires ADMIN or COORDINATOR role.")
    public ResponseEntity<?> getAllContests(HttpServletRequest request) {
        try {
            requireAdminOrCoordinatorRole(request);
            // Returns a simple list
            return ResponseEntity.ok(contestAdminService.getAllContests());
        } catch (SecurityException e) {
            return ResponseEntity.status(403).body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));
        }
    }

    @GetMapping("/{contestId}")
    @Operation(summary = "Get Contest details for Admin", description = "Requires ADMIN or COORDINATOR role.")
    public ResponseEntity<?> getContestDetails(HttpServletRequest request, @PathVariable Long contestId) {
        try {
            requireAdminOrCoordinatorRole(request);
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
    @Operation(summary = "Create a new Hackathon Contest", description = "Requires ADMIN or COORDINATOR role.")
    public ResponseEntity<?> createContest(HttpServletRequest request, @Valid @RequestBody CreateContestRequest contestRequest) {
        try {
            requireAdminOrCoordinatorRole(request);
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
    @Operation(summary = "Create a Track and configure its Tournament Rounds", description = "Requires ADMIN or COORDINATOR role.")
    public ResponseEntity<?> createTrackAndRounds(HttpServletRequest request, @Valid @RequestBody CreateTrackRoundRequest trackRequest) {
        try {
            requireAdminOrCoordinatorRole(request);
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

    @PostMapping("/rubrics")
    @Operation(summary = "Create and Bind a Rubric Template", description = "Requires ADMIN or COORDINATOR role.")
    public ResponseEntity<?> createRubric(HttpServletRequest request, @Valid @RequestBody CreateRubricRequest rubricRequest) {
        try {
            requireAdminOrCoordinatorRole(request);
            ContestRubric rubric = rubricAdminService.createRubric(rubricRequest);
            return ResponseEntity.ok(Map.of("message", "Rubric created and bound successfully", "rubricId", rubric.getId()));
        } catch (SecurityException e) {
            return ResponseEntity.status(403).body(Map.of("error", e.getMessage()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", "Internal Error: " + e.getMessage()));
        }
    }

    @GetMapping("/rubric-templates")
    @Operation(summary = "Get all Rubric Templates", description = "Requires ADMIN or COORDINATOR role.")
    public ResponseEntity<?> getAllRubricTemplates(HttpServletRequest request) {
        try {
            requireAdminOrCoordinatorRole(request);
            return ResponseEntity.ok(rubricAdminService.getAllTemplates());
        } catch (SecurityException e) {
            return ResponseEntity.status(403).body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", "Internal Error: " + e.getMessage()));
        }
    }

    @GetMapping("/rubrics")
    @Operation(summary = "Get all Contest Rubric bindings", description = "Requires ADMIN or COORDINATOR role.")
    public ResponseEntity<?> getAllContestRubrics(HttpServletRequest request) {
        try {
            requireAdminOrCoordinatorRole(request);
            return ResponseEntity.ok(rubricAdminService.getAllContestRubrics());
        } catch (SecurityException e) {
            return ResponseEntity.status(403).body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", "Internal Error: " + e.getMessage()));
        }
    }

    @PostMapping("/rubric-templates")
    @Operation(summary = "Create a Rubric Template (template-only, no round binding)", description = "Requires ADMIN or COORDINATOR role.")
    public ResponseEntity<?> createRubricTemplate(HttpServletRequest request, @Valid @RequestBody CreateRubricRequest rubricRequest) {
        try {
            requireAdminOrCoordinatorRole(request);
            com.fpt.shms.be.model.RubricTemplate saved = rubricAdminService.createTemplateOnly(rubricRequest);
            return ResponseEntity.ok(Map.of("message", "Template saved successfully", "templateId", saved.getId()));
        } catch (SecurityException e) {
            return ResponseEntity.status(403).body(Map.of("error", e.getMessage()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", "Internal Error: " + e.getMessage()));
        }
    }

    @GetMapping("/rubric-templates/{id}")
    @Operation(summary = "Get Rubric Template by ID", description = "Requires ADMIN or COORDINATOR role.")
    public ResponseEntity<?> getRubricTemplateById(HttpServletRequest request, @PathVariable Long id) {
        try {
            requireAdminOrCoordinatorRole(request);
            return ResponseEntity.ok(rubricAdminService.getTemplateById(id));
        } catch (SecurityException e) {
            return ResponseEntity.status(403).body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", "Internal Error: " + e.getMessage()));
        }
    }

    @PostMapping("/rubric-templates/{id}/clone")
    @Operation(summary = "Clone a Rubric Template", description = "Requires ADMIN or COORDINATOR role.")
    public ResponseEntity<?> cloneRubricTemplate(HttpServletRequest request, @PathVariable Long id) {
        try {
            requireAdminOrCoordinatorRole(request);
            return ResponseEntity.ok(rubricAdminService.cloneTemplate(id));
        } catch (SecurityException e) {
            return ResponseEntity.status(403).body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", "Internal Error: " + e.getMessage()));
        }
    }

    @PutMapping("/rubric-templates/{id}")
    @Operation(summary = "Update a Rubric Template", description = "Requires ADMIN or COORDINATOR role.")
    public ResponseEntity<?> updateRubricTemplate(HttpServletRequest request, @PathVariable Long id, @Valid @RequestBody CreateRubricRequest rubricRequest) {
        try {
            requireAdminOrCoordinatorRole(request);
            return ResponseEntity.ok(rubricAdminService.updateTemplate(id, rubricRequest));
        } catch (SecurityException e) {
            return ResponseEntity.status(403).body(Map.of("error", e.getMessage()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", "Internal Error: " + e.getMessage()));
        }
    }

    @DeleteMapping("/rubric-templates/{id}")
    @Operation(summary = "Delete a Rubric Template", description = "Requires ADMIN or COORDINATOR role.")
    public ResponseEntity<?> deleteRubricTemplate(HttpServletRequest request, @PathVariable Long id) {
        try {
            requireAdminOrCoordinatorRole(request);
            rubricAdminService.deleteTemplate(id);
            return ResponseEntity.ok(Map.of("message", "Template deleted successfully"));
        } catch (SecurityException e) {
            return ResponseEntity.status(403).body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", "Cannot delete template because it might be in use, or another error occurred: " + e.getMessage()));
        }
    }

    @GetMapping("/{contestId}/partners")
    @Operation(summary = "Get Partner Universities for a Contest", description = "Requires ADMIN or COORDINATOR role.")
    public ResponseEntity<?> getPartnersByContest(HttpServletRequest request, @PathVariable Long contestId) {
        try {
            requireAdminOrCoordinatorRole(request);
            List<UniversityDto> partners = partnerAdminService.getPartnersByContest(contestId);
            return ResponseEntity.ok(partners);
        } catch (SecurityException e) {
            return ResponseEntity.status(403).body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));
        }
    }

    @PostMapping("/{contestId}/partners")
    @Operation(summary = "Configure Partner Universities for a Contest", description = "Requires ADMIN or COORDINATOR role.")
    public ResponseEntity<?> configurePartnersForContest(HttpServletRequest request, @PathVariable Long contestId, @Valid @RequestBody List<UniversityDto> partners) {
        try {
            requireAdminOrCoordinatorRole(request);
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
    @Operation(summary = "Get Student Validation Data for a Contest's Partner", description = "Requires ADMIN or COORDINATOR role.")
    public ResponseEntity<?> getStudentValidationData(HttpServletRequest request, @PathVariable Long contestId, @RequestParam String university) {
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

    @PostMapping("/{contestId}/partners/students")
    @Operation(summary = "Save Student Validation Data for a Contest's Partner", description = "Requires ADMIN or COORDINATOR role.")
    public ResponseEntity<?> saveStudentValidationData(HttpServletRequest request, @PathVariable Long contestId, @RequestBody List<StudentVerificationDataDto> students) {
        try {
            requireAdminOrCoordinatorRole(request);
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
}
