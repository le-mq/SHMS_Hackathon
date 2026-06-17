package com.fpt.shms.be.controller;
import com.fpt.shms.be.dto.*;
import com.fpt.shms.be.model.Team;
import com.fpt.shms.be.repository.CategoryRepository;
import com.fpt.shms.be.repository.ContestRepository;
import com.fpt.shms.be.service.StudentService;
import com.fpt.shms.be.service.SubmissionService;
import com.fpt.shms.be.service.TeamService;
import com.fpt.shms.be.util.JwtUtils;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
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
    private final TeamService teamService;
    private final ContestRepository contestRepository;
    private final CategoryRepository categoryRepository;
    private final SubmissionService submissionService;

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

    @GetMapping("/contests")
    public ResponseEntity<?> getContests(HttpServletRequest request) {
        try {
            return ResponseEntity.ok(contestRepository.findAll().stream().map(c -> Map.of("id", c.getId(), "name", c.getName())).toList());
        } catch (Exception e) {
            return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));
        }
    }

    @GetMapping("/categories")
    public ResponseEntity<?> getCategories(HttpServletRequest request) {
        try {
            return ResponseEntity.ok(categoryRepository.findAll().stream().map(c -> Map.of("id", c.getId(), "name", c.getName())).toList());
        } catch (Exception e) {
            return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));
        }
    }

    @GetMapping("/submissions")
    @Operation(summary = "Get Submission Page Data", description = "Returns contest, round, role, and history.")
    public ResponseEntity<?> getSubmissionPageData(HttpServletRequest request) {
        try {
            String token = jwtUtils.extractToken(request);
            if (token == null || !jwtUtils.validateToken(token)) {
                return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));
            }

            String username = jwtUtils.getUsernameFromToken(token);
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
            String token = jwtUtils.extractToken(request);
            if (token == null || !jwtUtils.validateToken(token)) {
                return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));
            }

            String username = jwtUtils.getUsernameFromToken(token);
            submissionService.submitProject(submitRequest, username);

            return ResponseEntity.ok(Map.of("message", "Project submitted successfully"));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));
        }
    }

    @PostMapping("/teams/create")
    @Operation(summary = "Initialize New Team", description = "Creates a team and generates an invitation code. Assigns leader role.")
    public ResponseEntity<?> createTeam(HttpServletRequest request, @Valid @RequestBody CreateTeamRequest teamRequest) {
        try {
            String token = jwtUtils.extractToken(request);
            if (token == null || !jwtUtils.validateToken(token)) {
                return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));
            }

            String username = jwtUtils.getUsernameFromToken(token);
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
            String token = jwtUtils.extractToken(request);
            if (token == null || !jwtUtils.validateToken(token)) {
                return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));
            }

            String username = jwtUtils.getUsernameFromToken(token);
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
            String token = jwtUtils.extractToken(request);
            if (token == null || !jwtUtils.validateToken(token)) {
                return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));
            }

            String username = jwtUtils.getUsernameFromToken(token);
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
    public ResponseEntity<?> getTeamStatus(HttpServletRequest request) {
        try {
            String token = jwtUtils.extractToken(request);
            if (token == null || !jwtUtils.validateToken(token)) {
                return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));
            }

            String username = jwtUtils.getUsernameFromToken(token);
            return ResponseEntity.ok(teamService.getTeamStatus(username));
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
            String token = jwtUtils.extractToken(request);
            if (token == null || !jwtUtils.validateToken(token)) {
                return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));
            }

            String username = jwtUtils.getUsernameFromToken(token);
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
            String token = jwtUtils.extractToken(request);
            if (token == null || !jwtUtils.validateToken(token)) {
                return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));
            }

            String username = jwtUtils.getUsernameFromToken(token);
            return ResponseEntity.ok(teamService.getWorkspaceData(username));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));
        }
    }
}
