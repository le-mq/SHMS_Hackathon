package com.fpt.shms.be.controller;

import com.fpt.shms.be.dto.CreateContestRequest;
import com.fpt.shms.be.dto.CreateTrackRoundRequest;
import com.fpt.shms.be.dto.CreateRubricRequest;
import com.fpt.shms.be.dto.StudentVerificationDataDto;
import com.fpt.shms.be.dto.UniversityDto;
import com.fpt.shms.be.dto.CreateExpertRequest;
import com.fpt.shms.be.dto.ExpertAllocationRequest;
import com.fpt.shms.be.dto.UpdateTeamStatusRequest;
import com.fpt.shms.be.dto.CreateAnnouncementRequest;
import com.fpt.shms.be.model.Contest;
import com.fpt.shms.be.model.Category;
import com.fpt.shms.be.model.ContestRubric;
import com.fpt.shms.be.service.ContestAdminService;
import com.fpt.shms.be.service.RubricAdminService;
import com.fpt.shms.be.service.PartnerAdminService;
import com.fpt.shms.be.service.ExpertAdminService;
import com.fpt.shms.be.service.AllocationAdminService;
import com.fpt.shms.be.service.TeamService;
import com.fpt.shms.be.util.JwtUtils;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import com.fpt.shms.be.service.UserService;
import com.fpt.shms.be.dto.UpdateProfileRequest;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/admin")
@RequiredArgsConstructor
@Tag(name = "Admin", description = "Admin Contest Management APIs")
public class AdminController {

    private final ContestAdminService contestAdminService;
    private final RubricAdminService rubricAdminService;
    private final PartnerAdminService partnerAdminService;
    private final ExpertAdminService expertAdminService;
    private final AllocationAdminService allocationAdminService;
    private final TeamService teamService;
    private final JwtUtils jwtUtils;
    private final UserService userService;

    private void requireAdminRole(HttpServletRequest request) {
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
    @Operation(summary = "Get all Hackathon Contests", description = "Requires ADMIN role.")
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

    @GetMapping("/contests/{contestId}")
    @Operation(summary = "Get Contest details for Admin", description = "Requires ADMIN role.")
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
    public ResponseEntity<?> createContest(HttpServletRequest request,
                                           @Valid @RequestBody CreateContestRequest contestRequest) {
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

    @PostMapping("/contests/rounds-tracks")
    @Operation(summary = "Create a Track and configure its Tournament Rounds", description = "Requires ADMIN role.")
    public ResponseEntity<?> createTrackAndRounds(HttpServletRequest request,
                                                  @Valid @RequestBody CreateTrackRoundRequest trackRequest) {
        try {
            requireAdminRole(request);
            Category category = contestAdminService.createTrackAndRounds(trackRequest);
            return ResponseEntity
                    .ok(Map.of("message", "Track and rounds configured successfully", "categoryId", category.getId()));
        } catch (SecurityException e) {
            return ResponseEntity.status(403).body(Map.of("error", e.getMessage()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body(Map.of("error", "Internal Error: " + e.getMessage()));
        }
    }

    @PostMapping("/contests/rubrics")
    @Operation(summary = "Create and Bind a Rubric Template", description = "Requires ADMIN role.")
    public ResponseEntity<?> createRubric(HttpServletRequest request,
                                          @Valid @RequestBody CreateRubricRequest rubricRequest) {
        try {
            requireAdminRole(request);
            ContestRubric rubric = rubricAdminService.createRubric(rubricRequest);
            return ResponseEntity
                    .ok(Map.of("message", "Rubric created and bound successfully", "rubricId", rubric.getId()));
        } catch (SecurityException e) {
            return ResponseEntity.status(403).body(Map.of("error", e.getMessage()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", "Internal Error: " + e.getMessage()));
        }
    }

    @GetMapping("/contests/rubric-templates")
    @Operation(summary = "Get all Rubric Templates", description = "Requires ADMIN role.")
    public ResponseEntity<?> getAllRubricTemplates(HttpServletRequest request) {
        try {
            requireAdminRole(request);
            return ResponseEntity.ok(rubricAdminService.getAllTemplates());
        } catch (SecurityException e) {
            return ResponseEntity.status(403).body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", "Internal Error: " + e.getMessage()));
        }
    }

    @GetMapping("/contests/rubrics")
    @Operation(summary = "Get all Contest Rubric bindings", description = "Requires ADMIN role.")
    public ResponseEntity<?> getAllContestRubrics(HttpServletRequest request) {
        try {
            requireAdminRole(request);
            return ResponseEntity.ok(rubricAdminService.getAllContestRubrics());
        } catch (SecurityException e) {
            return ResponseEntity.status(403).body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", "Internal Error: " + e.getMessage()));
        }
    }

    @PostMapping("/contests/rubric-templates")
    @Operation(summary = "Create a Rubric Template (template-only, no round binding)", description = "Requires ADMIN role.")
    public ResponseEntity<?> createRubricTemplate(HttpServletRequest request,
                                                  @Valid @RequestBody CreateRubricRequest rubricRequest) {
        try {
            requireAdminRole(request);
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

    @GetMapping("/contests/rubric-templates/{id}")
    @Operation(summary = "Get Rubric Template by ID", description = "Requires ADMIN role.")
    public ResponseEntity<?> getRubricTemplateById(HttpServletRequest request, @PathVariable Long id) {
        try {
            requireAdminRole(request);
            return ResponseEntity.ok(rubricAdminService.getTemplateById(id));
        } catch (SecurityException e) {
            return ResponseEntity.status(403).body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", "Internal Error: " + e.getMessage()));
        }
    }

    @PostMapping("/contests/rubric-templates/{id}/clone")
    @Operation(summary = "Clone a Rubric Template", description = "Requires ADMIN role.")
    public ResponseEntity<?> cloneRubricTemplate(HttpServletRequest request, @PathVariable Long id) {
        try {
            requireAdminRole(request);
            return ResponseEntity.ok(rubricAdminService.cloneTemplate(id));
        } catch (SecurityException e) {
            return ResponseEntity.status(403).body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", "Internal Error: " + e.getMessage()));
        }
    }

    @PutMapping("/contests/rubric-templates/{id}")
    @Operation(summary = "Update a Rubric Template", description = "Requires ADMIN role.")
    public ResponseEntity<?> updateRubricTemplate(HttpServletRequest request, @PathVariable Long id,
                                                  @Valid @RequestBody CreateRubricRequest rubricRequest) {
        try {
            requireAdminRole(request);
            return ResponseEntity.ok(rubricAdminService.updateTemplate(id, rubricRequest));
        } catch (SecurityException e) {
            return ResponseEntity.status(403).body(Map.of("error", e.getMessage()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", "Internal Error: " + e.getMessage()));
        }
    }

    @DeleteMapping("/contests/rubric-templates/{id}")
    @Operation(summary = "Delete a Rubric Template", description = "Requires ADMIN role.")
    public ResponseEntity<?> deleteRubricTemplate(HttpServletRequest request, @PathVariable Long id) {
        try {
            requireAdminRole(request);
            rubricAdminService.deleteTemplate(id);
            return ResponseEntity.ok(Map.of("message", "Template deleted successfully"));
        } catch (SecurityException e) {
            return ResponseEntity.status(403).body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error",
                    "Cannot delete template because it might be in use, or another error occurred: " + e.getMessage()));
        }
    }

    @GetMapping("/contests/{contestId}/partners")
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

    @PostMapping("/contests/announcements")
    @Operation(summary = "Create an Announcement", description = "Requires ADMIN role.")
    public ResponseEntity<?> createAnnouncement(HttpServletRequest request,
                                                @Valid @RequestBody CreateAnnouncementRequest announcementRequest) {
        try {
            requireAdminRole(request);
            var announcement = contestAdminService.createAnnouncement(announcementRequest);
            return ResponseEntity.ok(
                    Map.of("message", "Announcement broadcasted successfully", "announcementId", announcement.getId()));
        } catch (SecurityException e) {
            return ResponseEntity.status(403).body(Map.of("error", e.getMessage()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "An error occurred while creating announcement"));
        }
    }

    @PostMapping("/contests/{contestId}/partners")
    @Operation(summary = "Configure Partner Universities for a Contest", description = "Requires ADMIN role.")
    public ResponseEntity<?> configurePartnersForContest(HttpServletRequest request, @PathVariable Long contestId,
                                                         @Valid @RequestBody List<UniversityDto> partners) {
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

    @GetMapping("/contests/{contestId}/partners/students")
    @Operation(summary = "Get Student Validation Data for a Contest's Partner", description = "Requires ADMIN role.")
    public ResponseEntity<?> getStudentValidationData(HttpServletRequest request, @PathVariable Long contestId,
                                                      @RequestParam String university) {
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

    @PostMapping("/contests/{contestId}/partners/students")
    @Operation(summary = "Save Student Validation Data for a Contest's Partner", description = "Requires ADMIN role.")
    public ResponseEntity<?> saveStudentValidationData(HttpServletRequest request, @PathVariable Long contestId,
                                                       @RequestBody List<StudentVerificationDataDto> students) {
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

    @PostMapping("/contests/experts/create")
    @Operation(summary = "Provision Expert Credentials", description = "Requires ADMIN role.")
    public ResponseEntity<?> createExpert(HttpServletRequest request,
                                          @Valid @RequestBody CreateExpertRequest expertRequest) {
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

    @GetMapping("/contests/experts")
    @Operation(summary = "Get all Experts", description = "Requires ADMIN role.")
    public ResponseEntity<?> getAllExperts(HttpServletRequest request) {
        try {
            requireAdminRole(request);
            return ResponseEntity.ok(expertAdminService.getAllExperts());
        } catch (Exception e) {
            return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));
        }
    }

    @PutMapping("/contests/experts/{userId}/expiry")
    @Operation(summary = "Extend Expert Expiry", description = "Requires ADMIN role.")
    public ResponseEntity<?> extendExpertExpiry(HttpServletRequest request, @PathVariable Long userId,
                                                @Valid @RequestBody com.fpt.shms.be.dto.ExtendExpiryRequest extendRequest) {
        try {
            requireAdminRole(request);
            expertAdminService.extendExpiry(userId, extendRequest.getNewExpiry());
            return ResponseEntity.ok(Map.of("message", "Expiry extended successfully"));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body(Map.of("error", "Internal Error: " + e.getMessage()));
        }
    }

    @PutMapping("/contests/experts/{userId}/roles")
    @Operation(summary = "Update Expert Roles", description = "Requires ADMIN role.")
    public ResponseEntity<?> updateExpertRoles(HttpServletRequest request, @PathVariable Long userId,
                                               @RequestBody java.util.Map<String, java.util.List<String>> rolesMap) {
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

    @DeleteMapping("/contests/experts/{userId}")
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

    @PostMapping("/contests/allocations")
    @Operation(summary = "Allocate Expert to Panels", description = "Requires ADMIN role.")
    public ResponseEntity<?> allocateExpert(HttpServletRequest request,
                                            @Valid @RequestBody ExpertAllocationRequest allocationRequest) {
        try {
            requireAdminRole(request);
            allocationAdminService.allocateExpert(allocationRequest);
            return ResponseEntity.ok(Map.of("message", "Allocation mapping saved successfully"));
        } catch (SecurityException e) {
            return ResponseEntity.status(403).body(Map.of("error", e.getMessage()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body(Map.of("error", "Internal Error: " + e.getMessage()));
        }
    }

    @GetMapping("/contests/allocations")
    @Operation(summary = "Get All Allocations", description = "Get current mentor and judge assignments for experts.")
    public ResponseEntity<?> getAllocations(HttpServletRequest request) {
        try {
            requireAdminRole(request);
            return ResponseEntity.ok(allocationAdminService.getAllAllocations());
        } catch (SecurityException e) {
            return ResponseEntity.status(403).body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));
        }
    }

    // --- TEAM REGISTRATION APPROVAL ---

    @PutMapping("/contests/teams/registration-status")
    @Operation(summary = "Approve or Reject Team Registration", description = "Admin sets team status (APPROVED or REJECTED).")
    public ResponseEntity<?> updateTeamStatus(HttpServletRequest request,
                                              @Valid @RequestBody UpdateTeamStatusRequest statusRequest) {
        try {
            requireAdminRole(request);
            teamService.updateTeamStatus(statusRequest.getTeamId(), statusRequest.getStatus());
            return ResponseEntity.ok(Map.of("message", "Team status updated to " + statusRequest.getStatus()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));
        }
    }

    @GetMapping("/contests/teams/dashboard-data")
    @Operation(summary = "Get Dashboard Data for Team Registration Approval", description = "Admin dashboard data for teams.")
    public ResponseEntity<?> getTeamDashboardData(HttpServletRequest request) {
        try {
            requireAdminRole(request);
            return ResponseEntity.ok(teamService.getAdminTeamDashboardData());
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body(Map.of("error", "Internal Error: " + e.getMessage()));
        }
    }

    @GetMapping("/profile")
    @Operation(summary = "Get Admin Profile", description = "Requires ADMIN role.")
    public ResponseEntity<?> getProfile(HttpServletRequest request) {
        try {
            requireAdminRole(request);
            String token = request.getHeader("Authorization").substring(7);
            String username = jwtUtils.extractUsername(token);
            return ResponseEntity.ok(userService.getUserProfile(username));
        } catch (SecurityException e) {
            return ResponseEntity.status(403).body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }

    @PutMapping("/profile")
    @Operation(summary = "Update Admin Profile", description = "Requires ADMIN role.")
    public ResponseEntity<?> updateProfile(HttpServletRequest request, @RequestBody UpdateProfileRequest payload) {
        try {
            requireAdminRole(request);
            String token = request.getHeader("Authorization").substring(7);
            String username = jwtUtils.extractUsername(token);

            userService.updateUserProfile(username, payload);
            return ResponseEntity.ok(Map.of("message", "Profile updated successfully"));
        } catch (SecurityException e) {
            return ResponseEntity.status(403).body(Map.of("error", e.getMessage()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }
}

