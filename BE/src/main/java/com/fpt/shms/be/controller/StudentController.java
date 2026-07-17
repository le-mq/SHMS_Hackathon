package com.fpt.shms.be.controller;
import com.fpt.shms.be.dto.*;
import com.fpt.shms.be.model.Category;
import com.fpt.shms.be.model.Team;
import com.fpt.shms.be.repository.CategoryRepository;
import com.fpt.shms.be.repository.ContestRepository;
import com.fpt.shms.be.service.StudentService;
import com.fpt.shms.be.service.SubmissionService;
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

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/student")
@PreAuthorize("hasAnyAuthority('STUDENT', 'LEADER')")
@RequiredArgsConstructor
@Tag(name = "Student", description = "Student Profile APIs")
public class StudentController {

    private final StudentService studentService;
    private final TeamService teamService;
    private final ContestRepository contestRepository;
    private final CategoryRepository categoryRepository;
    private final SubmissionService submissionService;
    private final com.fpt.shms.be.repository.UserRepository userRepository;
    private final com.fpt.shms.be.repository.StudentRepository studentRepository;
    private final com.fpt.shms.be.repository.ContestUniversityRepository contestUniversityRepository;

    @GetMapping("/profile")
    @Operation(summary = "Get Student Profile", description = "Retrieves the profile of the currently authenticated student.")
    public ResponseEntity<?> getProfile(HttpServletRequest request) {
        try {
            String username = SecurityContextHolder.getContext().getAuthentication().getName();
            String role = SecurityContextHolder.getContext().getAuthentication().getAuthorities().iterator().next().getAuthority();
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
            String username = SecurityContextHolder.getContext().getAuthentication().getName();
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
            String username = SecurityContextHolder.getContext().getAuthentication().getName();
            studentService.deleteProfile(username);
            return ResponseEntity.ok(Map.of("message", "Profile deleted successfully"));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));
        }
    }

    @GetMapping("/contests")
    public org.springframework.http.ResponseEntity<?> getContests(jakarta.servlet.http.HttpServletRequest request) {
        try {
            String username = SecurityContextHolder.getContext().getAuthentication().getName();

            com.fpt.shms.be.model.User user = userRepository.findByUsername(username)
                    .orElseThrow(() -> new IllegalArgumentException("User not found"));

            studentRepository.findByUser(user)
                    .orElseThrow(() -> new IllegalArgumentException("Student not found"));

            java.util.List<com.fpt.shms.be.model.Contest> allowedContests = contestRepository.findAll();

            return org.springframework.http.ResponseEntity.ok(allowedContests.stream()
                    .map(c -> {
                        java.util.List<String> allowedUnis = contestUniversityRepository.findByContestId(c.getId())
                                .stream()
                                .map(cu -> cu.getUniversity().getName())
                                .toList();
                        java.util.Map<String, Object> map = new java.util.HashMap<>();
                        map.put("id", c.getId());
                        map.put("name", c.getName());
                        map.put("status", c.getStatus() != null ? c.getStatus().name() : "CLOSED");
                        map.put("allowedUniversities", allowedUnis);
                        map.put("registrationStart", c.getRegistrationStart());
                        map.put("registrationEnd", c.getRegistrationEnd());
                        map.put("contestStartAt", c.getContestStartAt());
                        map.put("contestEndAt", c.getContestEndAt());
                        map.put("minTeamMembers", c.getMinTeamMembers());
                        map.put("maxTeamMembers", c.getMaxTeamMembers());
                        map.put("description", c.getDescription());
                        map.put("location", c.getLocation());
                        map.put("tieredPrizeStructures", c.getTieredPrizeStructures());
                        map.put("complianceRules", c.getComplianceRules());
                        java.util.List<String> categoryNames = categoryRepository.findByContestId(c.getId())
                                .stream()
                                .map(com.fpt.shms.be.model.Category::getName)
                                .toList();
                        map.put("categories", categoryNames);
                        return map;
                    })
                    .toList());

        } catch (IllegalArgumentException e) {
            return org.springframework.http.ResponseEntity.badRequest().body(java.util.Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return org.springframework.http.ResponseEntity.status(401).body(java.util.Map.of("error", "Unauthorized"));
        }
    }
    @PreAuthorize("isAuthenticated()")
    @GetMapping("/categories")
    public ResponseEntity<?> getCategories(@RequestParam(required = false) Long contestId) {
        List<Category> categories;

        if (contestId != null) {
            categories = categoryRepository.findByContestId(contestId);
        } else {
            categories = categoryRepository.findAll();
        }

        return ResponseEntity.ok(
                categories.stream().map(c -> {
                    Map<String, Object> item = new HashMap<>();
                    item.put("id", c.getId());
                    item.put("name", c.getName());
                    item.put("contestId", c.getContest().getId());
                    return item;
                }).toList()
        );
    }

    @GetMapping("/submissions")
    @Operation(summary = "Get Submission Page Data", description = "Returns contest, round, role, and history.")
    public ResponseEntity<?> getSubmissionPageData(HttpServletRequest request, @RequestParam(required = false) Long contestId) {
        try {
            String username = SecurityContextHolder.getContext().getAuthentication().getName();
            return ResponseEntity.ok(submissionService.getSubmissionPageData(username, contestId));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));
        }
    }

    @PostMapping("/submissions/project")
    @Operation(summary = "Submit Project Assets", description = "Team Leader submits URLs for grading.")
    public ResponseEntity<?> submitProject(HttpServletRequest request, @Valid @RequestBody com.fpt.shms.be.dto.SubmitProjectRequest submitRequest) {
        try {
            String username = SecurityContextHolder.getContext().getAuthentication().getName();
            SubmissionPageResponse response = submissionService.submitProject(submitRequest, username);

            return ResponseEntity.ok(Map.of(
                    "message", "Project submitted successfully",
                    "history", response.getHistory(),
                    "rounds", response.getRounds(),
                    "submissionPage", response
            ));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/teams/create")
    @Operation(summary = "Initialize New Team", description = "Creates a team and generates an invitation code. Assigns leader role.")
    public ResponseEntity<?> createTeam(HttpServletRequest request, @Valid @RequestBody CreateTeamRequest teamRequest) {
        try {
            String username = SecurityContextHolder.getContext().getAuthentication().getName();
            Team team = teamService.createTeam(teamRequest, username);

            return ResponseEntity.ok(Map.of(
                    "message", "Team initialized successfully",
                    "teamId", team.getId()
            ));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));
        }
    }

    @PostMapping("/teams/register-official")
    @Operation(summary = "Submit Official Team Registration", description = "Submits the team registration. Checks size, capacity, and time.")
    public ResponseEntity<?> registerOfficialTeam(HttpServletRequest request, @Valid @RequestBody TeamRegistrationRequest registrationRequest) {
        try {
            String username = SecurityContextHolder.getContext().getAuthentication().getName();
            TeamRegistrationResponse response = teamService.registerOfficialTeam(registrationRequest, username);

            if ("INELIGIBLE_MEMBERS".equals(response.getStatus())) {
                // Return 200 with the list of ineligible members so FE can show confirmation modal
                return ResponseEntity.ok(response);
            }

            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));
        }
    }

    @PostMapping("/teams/register-force")
    @Operation(summary = "Force Register Team", description = "Removes ineligible members and approves the team registration.")
    public ResponseEntity<?> registerForceApproveTeam(HttpServletRequest request, @Valid @RequestBody TeamRegistrationRequest registrationRequest) {
        try {
            String username = SecurityContextHolder.getContext().getAuthentication().getName();
            TeamRegistrationResponse response = teamService.registerForceApprove(registrationRequest, username);
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));
        }
    }


    @GetMapping("/teams/status")
    @Operation(summary = "Get Team Status", description = "Returns team metadata, roster, and status.")
    public ResponseEntity<?> getTeamStatus(HttpServletRequest request,
                                           @org.springframework.web.bind.annotation.RequestParam(required = false) Long contestId) {
        try {
            String username = SecurityContextHolder.getContext().getAuthentication().getName();

            return ResponseEntity.ok(teamService.getTeamStatus(username, contestId));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));
        }
    }

    @GetMapping("/teams/all-forming")
    @Operation(summary = "Get All Forming Teams Status", description = "Returns team status for all forming teams.")
    public ResponseEntity<?> getAllFormingTeamsStatus(HttpServletRequest request) {
        try {
            String username = SecurityContextHolder.getContext().getAuthentication().getName();
            return ResponseEntity.ok(teamService.getAllFormingTeamsStatus(username));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));
        }
    }


    @DeleteMapping("/teams/leave")
    @Operation(summary = "Leave Team", description = "Allows a member to voluntarily leave a specific team before registration.")
    public ResponseEntity<?> leaveTeam(@RequestParam Long teamId, HttpServletRequest request) {
        try {
            String username = SecurityContextHolder.getContext().getAuthentication().getName();


            teamService.leaveTeam(username, teamId);

            return ResponseEntity.ok(Map.of("message", "Successfully left the team"));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));
        }
    }

    @GetMapping("/workspace")
    @Operation(summary = "Get Leader Workspace Data", description = "Returns dashboard metrics for team leader.")
    public ResponseEntity<?> getWorkspaceData(HttpServletRequest request, @RequestParam(required = false) Long contestId) {
        try {
            String username = SecurityContextHolder.getContext().getAuthentication().getName();
            return ResponseEntity.ok(teamService.getWorkspaceData(username, contestId));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));
        }
    }

    @GetMapping("/team-score-details")
    @Operation(summary = "Get Own Team Score Details", description = "Returns detailed score breakdown for the user's team.")
    public ResponseEntity<?> getTeamScoreDetails(HttpServletRequest request,
                                                 @RequestParam(required = false) Long contestId) {
        try {
            String username = SecurityContextHolder.getContext().getAuthentication().getName();

            TeamScoreDetailsResponse response = submissionService.getTeamScoreDetails(username, contestId);
            return ResponseEntity.ok(response);

        } catch (IllegalArgumentException e) {

            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body(Map.of("error", "Internal Server Error: " + e.getMessage()));
        }
    }

    @GetMapping("/search")
    @PreAuthorize("hasAnyAuthority('STUDENT', 'LEADER')")
    @Operation(summary = "Search Students", description = "Search for students by student code or email.")
    public ResponseEntity<?> searchStudents(@RequestParam String keyword) {
        try {
            var results = teamService.searchStudents(keyword);
            return ResponseEntity.ok(results);
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/teams/invitations")
    @PreAuthorize("hasAnyAuthority('STUDENT', 'LEADER')")
    @Operation(summary = "Send Team Invitation", description = "Any approved team member can invite a student to join their team.")
    public ResponseEntity<?> sendInvitation(@RequestBody com.fpt.shms.be.dto.InvitationRequest invitationRequest) {
        try {
            String username = SecurityContextHolder.getContext().getAuthentication().getName();
            var result = teamService.sendInvitation(invitationRequest, username);
            return ResponseEntity.ok(result);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/teams/invitations/respond")
    @PreAuthorize("hasAnyAuthority('STUDENT', 'LEADER')")
    @Operation(summary = "Respond to Invitation", description = "Accept or reject a team invitation using the invitation token.")
    public ResponseEntity<?> respondToInvitation(@RequestBody com.fpt.shms.be.dto.InvitationRespondRequest respondRequest) {
        try {
            String username = SecurityContextHolder.getContext().getAuthentication().getName();
            var result = teamService.respondToInvitation(respondRequest, username);
            return ResponseEntity.ok(result);
        } catch (org.springframework.security.access.AccessDeniedException e) {
            return ResponseEntity.status(403).body(Map.of("error", e.getMessage()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/teams/invitations/pending")
    @PreAuthorize("hasAnyAuthority('STUDENT', 'LEADER')")
    @Operation(summary = "Get Pending Invitations", description = "Returns a list of pending team invitations for the current user.")
    public ResponseEntity<?> getPendingInvitations() {
        try {
            String username = SecurityContextHolder.getContext().getAuthentication().getName();
            var invitations = teamService.getPendingInvitations(username);
            return ResponseEntity.ok(invitations);
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }
}
