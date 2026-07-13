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
import com.fpt.shms.be.model.Round;
import com.fpt.shms.be.repository.RoundRepository;
import com.fpt.shms.be.service.ContestAdminService;
import com.fpt.shms.be.service.RubricAdminService;
import com.fpt.shms.be.service.PartnerAdminService;
import com.fpt.shms.be.service.ExpertAdminService;
import com.fpt.shms.be.service.AllocationAdminService;
import com.fpt.shms.be.service.JudgeService;
import com.fpt.shms.be.dto.EditScoreRequest;
import com.fpt.shms.be.service.TeamService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import com.fpt.shms.be.service.UserService;
import com.fpt.shms.be.dto.UpdateProfileRequest;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/admin")
@PreAuthorize("hasAuthority('ADMIN')")
@RequiredArgsConstructor
@Tag(name = "Admin", description = "Admin Management APIs")
public class AdminController {

    private final ContestAdminService contestAdminService;
    private final RubricAdminService rubricAdminService;
    private final PartnerAdminService partnerAdminService;
    private final ExpertAdminService expertAdminService;
    private final AllocationAdminService allocationAdminService;
    private final TeamService teamService;
    private final UserService userService;
    private final JudgeService judgeService;

    @GetMapping("/contests")
    @Operation(summary = "Get all Hackathon Contests", description = "Requires ADMIN role.")
    public ResponseEntity<?> getAllContests(HttpServletRequest request) {
        try {
            // Returns a simple list
            return ResponseEntity.ok(contestAdminService.getAllContests());
        } catch (Exception e) {
            return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));
        }
    }

    @GetMapping("/contests/{contestId}")
    @Operation(summary = "Get Contest details for Admin", description = "Requires ADMIN role.")
    public ResponseEntity<?> getContestDetails(HttpServletRequest request, @PathVariable Long contestId) {
        try {
            return ResponseEntity.ok(contestAdminService.getContestDetails(contestId));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(401).body(Map.of("error", "Unauthorized: " + e.getMessage()));
        }
    }

    @PostMapping("/contests")
    @Operation(summary = "Create a new Hackathon Contest", description = "Requires ADMIN role.")
    public ResponseEntity<?> createContest(HttpServletRequest request,
                                           @Valid @RequestBody CreateContestRequest contestRequest) {
        try {
            Contest contest = contestAdminService.createContest(contestRequest);
            return ResponseEntity.ok(Map.of("message", "Contest created successfully", "contestId", contest.getId()));
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
            Category category = contestAdminService.createTrackAndRounds(trackRequest);
            return ResponseEntity
                    .ok(Map.of("message", "Track and rounds configured successfully", "categoryId", category.getId()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body(Map.of("error", "Internal Error: " + e.getMessage()));
        }
    }

    @GetMapping("/contests/{contestId}/rounds")
    @Operation(summary = "Get Rounds for a Contest", description = "Returns rounds ordered by submission_open_at ASC.")
    public ResponseEntity<?> getRoundsForContest(HttpServletRequest request, @PathVariable Long contestId) {
        List<Round> rounds = contestAdminService.getAndSyncRoundsForContest(contestId);
        List<Map<String, Object>> response = rounds.stream().map(r -> {
            Map<String, Object> map = new HashMap<>();
            map.put("roundId", r.getId());
            map.put("roundName", r.getPhaseName());
            map.put("submissionOpenAt", r.getSubmissionOpen());
            map.put("status", r.getState() != null ? r.getState().name() : "UPCOMING");
            if (r.getCategory() != null) {
                map.put("categoryId", r.getCategory().getId());
                map.put("categoryName", r.getCategory().getName());
            }
            return map;
        }).toList();
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/contests/tracks/{categoryId}")
    @Operation(summary = "Delete a Track/Category", description = "Requires ADMIN role.")
    public ResponseEntity<?> deleteCategory(HttpServletRequest request, @PathVariable Long categoryId) {
        try {
            contestAdminService.deleteCategory(categoryId);
            return ResponseEntity.ok(Map.of("message", "Category deleted successfully"));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body(Map.of("error", "Internal Error: " + e.getMessage()));
        }
    }

    @GetMapping("/contests/{contestId}/rounds/{roundId}/teams")
    @Operation(summary = "Get Eligible Teams for Round")
    public ResponseEntity<?> getEligibleTeamsForRound(HttpServletRequest request,
                                                      @PathVariable Long contestId,
                                                      @PathVariable Long roundId) {
        return ResponseEntity.ok(allocationAdminService.getEligibleTeamsForRound(roundId));
    }

    @GetMapping("/contests/allocations")
    @Operation(summary = "Get Allocations", description = "Query allocations by roundId or get all legacy allocations.")
    public ResponseEntity<?> getAllocations(HttpServletRequest request,
                                            @RequestParam(value = "roundId", required = false) Long roundId) {
        if (roundId != null) {
            return ResponseEntity.ok(allocationAdminService.getAllocationsByRound(roundId));
        }
        return ResponseEntity.ok(allocationAdminService.getAllAllocations());
    }

    @PostMapping("/contests/allocations/notify")
    @Operation(summary = "Send assignment emails to experts", description = "Requires ADMIN role.")
    public ResponseEntity<?> notifyAllocatedExperts(HttpServletRequest request, @RequestParam Long roundId) {
        try {
            allocationAdminService.notifyAllocatedExperts(roundId);
            return ResponseEntity.ok(Map.of("message", "Email notifications process started successfully."));
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
            ContestRubric rubric = rubricAdminService.createRubric(rubricRequest);
            return ResponseEntity
                    .ok(Map.of("message", "Rubric created and bound successfully", "rubricId", rubric.getId()));
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
            return ResponseEntity.ok(rubricAdminService.getAllTemplates());
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", "Internal Error: " + e.getMessage()));
        }
    }

    @GetMapping("/contests/rubrics")
    @Operation(summary = "Get all Contest Rubric bindings", description = "Requires ADMIN role.")
    public ResponseEntity<?> getAllContestRubrics(HttpServletRequest request) {
        try {
            return ResponseEntity.ok(rubricAdminService.getAllContestRubrics());
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", "Internal Error: " + e.getMessage()));
        }
    }
    @PostMapping("/contests/rubric-templates")
    @Operation(summary = "Create a Rubric Template (template-only, no round binding)", description = "Requires ADMIN role.")
    public ResponseEntity<?> createRubricTemplate(HttpServletRequest request,
                                                  @Valid @RequestBody CreateRubricRequest rubricRequest) {
        try {
            com.fpt.shms.be.model.RubricTemplate saved = rubricAdminService.createTemplateOnly(rubricRequest);
            return ResponseEntity.ok(Map.of("message", "Template saved successfully", "templateId", saved.getId()));
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
            return ResponseEntity.ok(rubricAdminService.getTemplateById(id));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", "Internal Error: " + e.getMessage()));
        }
    }

    @PostMapping("/contests/rubric-templates/{id}/clone")
    @Operation(summary = "Clone a Rubric Template", description = "Requires ADMIN role.")
    public ResponseEntity<?> cloneRubricTemplate(HttpServletRequest request, @PathVariable Long id) {
        try {
            return ResponseEntity.ok(rubricAdminService.cloneTemplate(id));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", "Internal Error: " + e.getMessage()));
        }
    }

    @PutMapping("/contests/rubric-templates/{id}")
    @Operation(summary = "Update a Rubric Template", description = "Requires ADMIN role.")
    public ResponseEntity<?> updateRubricTemplate(HttpServletRequest request, @PathVariable Long id,
                                                  @Valid @RequestBody CreateRubricRequest rubricRequest) {
        try {
            return ResponseEntity.ok(rubricAdminService.updateTemplate(id, rubricRequest));
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
            rubricAdminService.deleteTemplate(id);
            return ResponseEntity.ok(Map.of("message", "Template deleted successfully"));
        } catch (IllegalStateException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error",
                    "Cannot delete template because it might be in use, or another error occurred: " + e.getMessage()));
        }
    }

    @GetMapping("/contests/{contestId}/partners")
    @Operation(summary = "Get Partner Universities for a Contest", description = "Requires ADMIN role.")
    public ResponseEntity<?> getPartnersByContest(HttpServletRequest request, @PathVariable Long contestId) {
        try {
            List<UniversityDto> partners = partnerAdminService.getPartnersByContest(contestId);
            return ResponseEntity.ok(partners);
        } catch (Exception e) {
            return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));
        }
    }

    @PostMapping("/contests/announcements")
    @Operation(summary = "Create an Announcement", description = "Requires ADMIN role.")
    public ResponseEntity<?> createAnnouncement(HttpServletRequest request,
                                                @Valid @RequestBody CreateAnnouncementRequest announcementRequest) {
        try {
            var announcement = contestAdminService.createAnnouncement(announcementRequest);
            return ResponseEntity.ok(
                    Map.of("message", "Announcement broadcasted successfully", "announcementId", announcement.getId()));
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
            partnerAdminService.savePartnersForContest(contestId, partners);
            return ResponseEntity.ok(Map.of("message", "Partner verification rules updated successfully"));
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
            List<StudentVerificationDataDto> students = partnerAdminService.getStudentVerificationData(university);
            return ResponseEntity.ok(students);
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", "Internal Error: " + e.getMessage()));
        }
    }

    @PostMapping("/contests/{contestId}/partners/students")
    @Operation(summary = "Save Student Validation Data for a Contest's Partner", description = "Requires ADMIN role.")
    public ResponseEntity<?> saveStudentValidationData(HttpServletRequest request, @PathVariable Long contestId,
                                                       @RequestBody List<StudentVerificationDataDto> students) {
        try {
            partnerAdminService.saveStudentVerificationData(students);
            return ResponseEntity.ok(Map.of("message", "Student verification data updated successfully"));
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
            expertAdminService.createExpert(expertRequest);
            return ResponseEntity.ok(Map.of("message", "Expert credentials provisioned successfully"));
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
            allocationAdminService.allocateExpert(allocationRequest);
            return ResponseEntity.ok(Map.of("message", "Allocation mapping saved successfully"));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body(Map.of("error", "Internal Error: " + e.getMessage()));
        }
    }

    @PutMapping("/contests/teams/registration-status")
    @Operation(summary = "Approve or Reject Team Registration", description = "Admin sets team status (APPROVED or REJECTED).")
    public ResponseEntity<?> updateTeamStatus(HttpServletRequest request,
                                              @Valid @RequestBody UpdateTeamStatusRequest statusRequest) {
        try {
            teamService.updateTeamStatus(statusRequest.getTeamId(), statusRequest.getStatus(), statusRequest.getReason());
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
            return ResponseEntity.ok(teamService.getAdminTeamDashboardData());
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body(Map.of("error", "Internal Error: " + e.getMessage()));
        }
    }

    @GetMapping("/contests/{contestId}/rounds/{roundId}/progress")
    @Operation(summary = "Get Round Progress and Submissions", description = "Admin tracking for round progress")
    public ResponseEntity<?> getRoundProgress(HttpServletRequest request,
                                              @PathVariable Long contestId,
                                              @PathVariable Long roundId) {
        try {
            return ResponseEntity.ok(teamService.getRoundProgress(contestId, roundId));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body(Map.of("error", "Internal Error: " + e.getMessage()));
        }
    }

    @GetMapping("/profile")
    @Operation(summary = "Get Admin Profile", description = "Requires ADMIN role.")
    public ResponseEntity<?> getProfile(HttpServletRequest request) {
        try {
            String username = SecurityContextHolder.getContext().getAuthentication().getName();
            return ResponseEntity.ok(userService.getUserProfile(username));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }

    @PutMapping("/profile")
    @Operation(summary = "Update Admin Profile", description = "Requires ADMIN role.")
    public ResponseEntity<?> updateProfile(HttpServletRequest request, @RequestBody UpdateProfileRequest payload) {
        try {
            String username = SecurityContextHolder.getContext().getAuthentication().getName();

            userService.updateUserProfile(username, payload);
            return ResponseEntity.ok(Map.of("message", "Profile updated successfully"));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }

    @PutMapping("/edit-submitted-score")
    @Operation(summary = "Admin Edit Submitted Score", description = "Admin edits an existing finalized score when requested by Judge or Council.")
    public ResponseEntity<?> editSubmittedScore(@RequestBody EditScoreRequest request) {
        try {
            if (request.getScoreId() == null || request.getNewTotalScore() == null) {
                return ResponseEntity.badRequest().body(Map.of("error", "scoreId and newTotalScore are required."));
            }
            judgeService.editSubmittedScore(request.getScoreId(), request.getNewTotalScore(), request.getReason());
            return ResponseEntity.ok(Map.of("message", "Score updated successfully by Admin and logged to audit trail."));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/contests/teams/penalty")
    @Operation(summary = "Apply Penalty to Team", description = "Admin applies a disciplinary penalty to a team.")
    public ResponseEntity<?> applyPenaltyToTeam(HttpServletRequest request,
                                                @Valid @RequestBody com.fpt.shms.be.dto.ApplyPenaltyRequest penaltyRequest) {
        try {
            teamService.applyPenaltyToTeam(penaltyRequest);
            return ResponseEntity.ok(Map.of("message", "Penalty applied successfully"));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body(Map.of("error", "Internal Error: " + e.getMessage()));
        }
    }
}