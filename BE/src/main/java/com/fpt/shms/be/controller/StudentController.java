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

            com.fpt.shms.be.model.Student student = studentRepository.findByUser(user)
                    .orElseThrow(() -> new IllegalArgumentException("Student not found"));

            Long universityId = student.getUniversity().getId();

            java.util.List<com.fpt.shms.be.model.Contest> allowedContests = contestRepository.findContestsByUniversityId(universityId);

            return org.springframework.http.ResponseEntity.ok(allowedContests.stream()
                    .map(c -> java.util.Map.of(
                            "id", c.getId(),
                            "name", c.getName(),
                            "status", c.getStatus() != null ? c.getStatus().name() : "CLOSED"
                    ))
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
    public ResponseEntity<?> getSubmissionPageData(HttpServletRequest request) {
        try {
            String username = SecurityContextHolder.getContext().getAuthentication().getName();
            return ResponseEntity.ok(submissionService.getSubmissionPageData(username));
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
                    "teamId", team.getId(),
                    "invitationCode", team.getInvitationCode()
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

            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));
        }
    }

    @PostMapping("/teams/join")
    @Operation(summary = "Join Team via Code", description = "Validates code and assigns user to a team.")
    public ResponseEntity<?> joinTeam(HttpServletRequest request, @Valid @RequestBody JoinTeamRequest joinRequest) {
        try {
            String username = SecurityContextHolder.getContext().getAuthentication().getName();
            teamService.joinTeam(joinRequest.getInvitationCode(), username);

            return ResponseEntity.ok(Map.of("message", "Successfully joined the team"));
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


    @DeleteMapping("/teams/leave")
    @Operation(summary = "Leave Team", description = "Allows a member to voluntarily leave their current team before registration.")
    public ResponseEntity<?> leaveTeam(HttpServletRequest request) {
        try {
            String username = SecurityContextHolder.getContext().getAuthentication().getName();
            teamService.leaveTeam(username);

            return ResponseEntity.ok(Map.of("message", "Successfully left the team"));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));
        }
    }

    @GetMapping("/workspace")
    @Operation(summary = "Get Leader Workspace Data", description = "Returns dashboard metrics for team leader.")
    public ResponseEntity<?> getWorkspaceData(HttpServletRequest request) {
        try {
            String username = SecurityContextHolder.getContext().getAuthentication().getName();
            return ResponseEntity.ok(teamService.getWorkspaceData(username));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));
        }
    }

    @GetMapping("/team-score-details")
    @Operation(summary = "Get Own Team Score Details", description = "Returns detailed score breakdown for the user's team.")
    public ResponseEntity<?> getTeamScoreDetails(HttpServletRequest request) {
        try {
            String username = SecurityContextHolder.getContext().getAuthentication().getName();

            TeamScoreDetailsResponse response = submissionService.getTeamScoreDetails(username);
            return ResponseEntity.ok(response);

        } catch (IllegalArgumentException e) {

            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body(Map.of("error", "Internal Server Error: " + e.getMessage()));
        }
    }
}