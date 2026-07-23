package com.fpt.shms.be.service;

import com.fpt.shms.be.dto.*;
import com.fpt.shms.be.model.*;
import com.fpt.shms.be.repository.*;
import com.fpt.shms.be.util.JwtUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class TeamService {
    private final TeamRepository teamRepository;
    private final TeamMembershipRepository teamMembershipRepository;
    private final UserRepository userRepository;
    private final StudentRepository studentRepository;
    private final RoleRepository roleRepository;
    private final ContestRepository contestRepository;
    private final CategoryRepository categoryRepository;
    private final RoundRepository roundRepository;
    private final SubmissionRepository submissionRepository;
    private final ContestUniversityRepository contestUniversityRepository;
    private final JwtUtils jwtUtils;
    private final AuditLogService auditLogService;
    private final AnnouncementRepository announcementRepository;
    private final RankingResultRepository rankingResultRepository;
    private final EmailService emailService;
    private final StudentVerificationDataRepository studentVerificationDataRepository;

    @Transactional
    public Team createTeam(CreateTeamRequest request, String leaderUsername) {
        User leader = userRepository.findByUsername(leaderUsername)
                .orElseThrow(() -> new IllegalArgumentException("Leader user not found"));

        boolean hasCreatedTeam = teamMembershipRepository.findByUserId(leader.getId()).stream()
                .anyMatch(m -> m.getInviterUserId() == null &&
                        m.getTeam() != null &&
                        "FORMING".equalsIgnoreCase(m.getTeam().getStatus()));
        if (hasCreatedTeam) {
            throw new IllegalArgumentException("You already have a team in FORMING status.");
        }

        Team team = Team.builder()
                .name(request.getTeamName())
                .build();
        team.generateTeamCode();
        team = teamRepository.save(team);
        auditLogService.log("CREATE_TEAM", "Team", team.getName(), null, team.getStatus(),
                "Created by: " + leaderUsername);

        TeamMembership memberMembership = TeamMembership.builder()
                .team(team)
                .user(leader)
                .role("MEMBER")
                .status("APPROVED")
                .build();
        teamMembershipRepository.save(memberMembership);

        return team;
    }

    @Transactional(readOnly = true)
    public TeamStatusResponse getTeamStatus(String username, Long contestId) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        List<TeamMembership> memberships = teamMembershipRepository.findByUserId(user.getId())
                .stream().filter(m -> "APPROVED".equalsIgnoreCase(m.getStatus()))
                .filter(m -> m.getTeam() == null || !"CANCELLED".equalsIgnoreCase(m.getTeam().getStatus()))
                .toList();
        if (memberships.isEmpty()) {
            throw new IllegalArgumentException("User is not in any team");
        }

        Team team = null;

        if (contestId != null) {
            for (TeamMembership m : memberships) {
                Team t = m.getTeam();
                Contest c = t.getContest();
                if (c != null && c.getId().equals(contestId)) {
                    team = t;
                    break;
                }
            }
        } else {
            java.time.LocalDate now = java.time.LocalDate.now();
            for (TeamMembership m : memberships) {
                Team t = m.getTeam();
                Contest c = t.getContest();
                if (c != null) {
                    boolean isOngoing = false;
                    if (Contest.ContestStatus.ACTIVED.equals(c.getStatus())) {
                        isOngoing = true;
                    }
                    if (c.getRegistrationStart() != null && c.getRegistrationEnd() != null) {
                        if (!now.isBefore(c.getRegistrationStart()) && !now.isAfter(c.getRegistrationEnd())) {
                            isOngoing = true;
                        }
                    }
                    if (isOngoing) {
                        team = t;
                        break;
                    }
                }
            }
            if (team == null) {
                team = memberships.stream()
                        .map(TeamMembership::getTeam)
                        .filter(java.util.Objects::nonNull)
                        .max(java.util.Comparator.comparing(Team::getId))
                        .orElse(memberships.get(0).getTeam());
            }
        }

        if (team == null) {
            throw new IllegalArgumentException("No team found for the selected contest");
        }

        return buildTeamStatusResponse(team);
    }

    private TeamStatusResponse buildTeamStatusResponse(Team team) {
        List<TeamMembership> roster = teamMembershipRepository.findByTeamId(team.getId())
                .stream()
                .filter(m -> "APPROVED".equalsIgnoreCase(m.getStatus()) || "PENDING".equalsIgnoreCase(m.getStatus()))
                .toList();

        List<TeamStatusResponse.MemberDto> memberDtos = roster.stream().map(m -> {
            Student student = studentRepository.findByUser(m.getUser()).orElse(null);
            Boolean isUnauthorized = false;
            Boolean hasAlreadyParticipated = false;

            return TeamStatusResponse.MemberDto.builder()
                    .fullName(student != null ? student.getFullName() : m.getUser().getUsername())
                    .studentId(student != null ? student.getStudentId() : "N/A")
                    .email(student != null ? student.getCorporateEmail() : "N/A")
                    .internalRole(m.getRole())
                    .status(m.getStatus())
                    .universityName(
                            student != null && student.getUniversity() != null ? student.getUniversity().getName()
                                    : "N/A")
                    .isUnauthorized(isUnauthorized)
                    .hasAlreadyParticipated(hasAlreadyParticipated)
                    .build();
        }).toList();

        Double finalScore = null;
        Integer rank = null;
        String submissionData = null;
        List<com.fpt.shms.be.model.RankingResult> rankings = rankingResultRepository.findByTeamId(team.getId());
        if (!rankings.isEmpty()) {
            com.fpt.shms.be.model.RankingResult rr = rankings.get(0);
            if (rr.getFinalScore() != null) {
                finalScore = rr.getFinalScore().doubleValue();
            }
            rank = rr.getRankNo();
        }
        List<Submission> subs = submissionRepository.findByTeamId(team.getId());
        if (!subs.isEmpty()) {
            Submission latestSub = subs.get(subs.size() - 1);
            submissionData = latestSub.getSubmissionData();
        }

        int minMembers = (team.getContest() != null && team.getContest().getMinTeamMembers() != null)
                ? team.getContest().getMinTeamMembers()
                : 3;
        int maxMembers = (team.getContest() != null && team.getContest().getMaxTeamMembers() != null)
                ? team.getContest().getMaxTeamMembers()
                : 5;
        long currentTotalMembers = teamMembershipRepository.countByTeamIdAndStatusIn(team.getId(),
                java.util.List.of("APPROVED", "PENDING"));

        String finalStatus = team.getStatus() != null ? team.getStatus() : "FORMING";
        if (team.getContest() != null
                && com.fpt.shms.be.model.Contest.ContestStatus.CLOSED.equals(team.getContest().getStatus())) {
            finalStatus = "CLOSED";
        }

        return TeamStatusResponse.builder()
                .teamId(team.getId())
                .teamName(team.getName())
                .teamCode(team.getTeamCode())
                .categoryName("All Categories")
                .status(finalStatus)
                .minMembers(minMembers)
                .maxMembers(maxMembers)
                .currentTotalMembers(currentTotalMembers)
                .roster(memberDtos)
                .finalScore(finalScore)
                .rank(rank)
                .contestId(team.getContest() != null ? team.getContest().getId() : null)
                .contestName(team.getContest() != null ? team.getContest().getName() : "Not Registered")
                .submissionData(submissionData)
                .build();
    }

    @Transactional(readOnly = true)
    public List<TeamStatusResponse> getAllFormingTeamsStatus(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        List<TeamMembership> memberships = teamMembershipRepository.findByUserId(user.getId())
                .stream().filter(m -> "APPROVED".equalsIgnoreCase(m.getStatus()))
                .filter(m -> m.getTeam() == null || !"CANCELLED".equalsIgnoreCase(m.getTeam().getStatus()))
                .toList();

        List<TeamStatusResponse> responses = new java.util.ArrayList<>();
        for (TeamMembership m : memberships) {
            Team team = m.getTeam();
            if (team != null) {
                responses.add(buildTeamStatusResponse(team));
            }
        }
        return responses;
    }

    @Transactional
    public void leaveTeam(String username, Long teamId) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        List<TeamMembership> memberships = teamMembershipRepository.findByUserId(user.getId());
        if (memberships.isEmpty()) {
            throw new IllegalArgumentException("You are not currently in any team.");
        }

        TeamMembership membership = memberships.stream()
                .filter(m -> m.getTeam() != null && m.getTeam().getId().equals(teamId))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("You are not in the specified team."));

        Team team = membership.getTeam();

        if ("PENDING".equals(team.getStatus()) || "APPROVED".equals(team.getStatus())) {
            throw new IllegalArgumentException("Cannot leave team while registration is pending or approved.");
        }

        teamMembershipRepository.delete(membership);
        auditLogService.log("LEAVE_TEAM", "Team", team.getName(), null, team.getStatus(), "User: " + username);
    }

    @Transactional
    public TeamRegistrationResponse registerOfficialTeam(TeamRegistrationRequest request, String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        List<TeamMembership> memberships = teamMembershipRepository.findByUserId(user.getId());
        if (memberships.isEmpty()) {
            throw new IllegalArgumentException("User is not in any team");
        }

        TeamMembership activeMembership = memberships.stream()
                .filter(m -> m.getTeam() != null && m.getTeam().getName() != null
                        && m.getTeam().getName().equals(request.getTeamName()))
                .findFirst()
                .orElseGet(() -> memberships.stream()
                        .filter(m -> m.getTeam() != null && !"CLOSED".equalsIgnoreCase(m.getTeam().getStatus())
                                && (m.getTeam().getContest() == null
                                || !com.fpt.shms.be.model.Contest.ContestStatus.CLOSED
                                .equals(m.getTeam().getContest().getStatus())))
                        .max(java.util.Comparator.comparing(m -> m.getTeam().getId()))
                        .orElse(memberships.get(0)));
        Team team = activeMembership.getTeam();

        if ("PENDING".equals(team.getStatus()) || "APPROVED".equals(team.getStatus())
                || "CANCELLED".equals(team.getStatus())) {
            throw new IllegalArgumentException("Team registration is already pending, approved, or cancelled.");
        }

        team.setName(request.getTeamName());
        Contest contest = null;
        if (request.getContestId() != null) {
            contest = contestRepository.findById(request.getContestId())
                    .orElseThrow(() -> new IllegalArgumentException("Contest not found"));

            if (Contest.ContestStatus.CLOSED.equals(contest.getStatus())) {
                throw new IllegalArgumentException("Contest is closed and no longer accepts registrations.");
            }
            team.setContest(contest);
        }

        List<TeamMembership> allMemberships = teamMembershipRepository.findByTeamId(team.getId());
        long approvedMemberCount = allMemberships.stream()
                .filter(tm -> "APPROVED".equalsIgnoreCase(tm.getStatus()))
                .count();

        // Validate that all approved members are current students
        List<TeamMembership> approvedMembers = allMemberships.stream()
                .filter(tm -> "APPROVED".equalsIgnoreCase(tm.getStatus()))
                .toList();

        List<TeamRegistrationResponse.IneligibleMemberDto> ineligibleMembers = new java.util.ArrayList<>();
        for (TeamMembership tm : approvedMembers) {
            Student memberStudent = studentRepository.findByUser(tm.getUser()).orElse(null);
            if (memberStudent != null) {
                try {
                    validateUniversityAllowed(memberStudent, contest);
                } catch (IllegalArgumentException e) {
                    ineligibleMembers.add(new TeamRegistrationResponse.IneligibleMemberDto(
                            memberStudent.getFullName(),
                            memberStudent.getStudentCode(),
                            "Unauthorized university"));
                }
            }
        }

        List<String> invalidMembersInfo = new java.util.ArrayList<>();
        for (TeamMembership tm : approvedMembers) {
            Student student = studentRepository.findByUser(tm.getUser()).orElse(null);
            if (student != null) {
                java.util.Optional<StudentVerificationData> verificationDataOpt = studentVerificationDataRepository
                        .findByStudentCode(student.getStudentCode());
                if (verificationDataOpt.isPresent()) {
                    StudentVerificationData verificationData = verificationDataOpt.get();
                    if (Boolean.FALSE.equals(verificationData.getIsCurrentStudent())) {
                        invalidMembersInfo.add("• " + student.getStudentCode() + " – " + student.getFullName());
                    }
                }
            }
        }

        if (!invalidMembersInfo.isEmpty()) {
            StringBuilder errorMsg = new StringBuilder();
            errorMsg.append(
                    "Your team cannot register because the following members are not marked as Current Students:\n");
            for (String info : invalidMembersInfo) {
                errorMsg.append(info).append("\n");
            }
            errorMsg.append("Please ask the administrator to update their student status before registering.");
            throw new IllegalArgumentException(errorMsg.toString());
        }

        if (contest != null) {
            for (TeamMembership tm : approvedMembers) {
                Long userId = tm.getUser().getId();
                List<TeamMembership> otherMemberships = teamMembershipRepository.findByUserId(userId);
                boolean alreadyParticipated = false;
                for (TeamMembership other : otherMemberships) {
                    Team otherTeam = other.getTeam();
                    if (otherTeam != null && !otherTeam.getId().equals(team.getId())
                            && otherTeam.getContest() != null) {
                        if (otherTeam.getContest().getId().equals(contest.getId())) {
                            String otherStatus = otherTeam.getStatus() != null ? otherTeam.getStatus().toUpperCase()
                                    : "";
                            if ("APPROVED".equals(otherStatus) || "PENDING".equals(otherStatus)) {
                                alreadyParticipated = true;
                                break;
                            }
                        }
                    }
                }
                if (alreadyParticipated) {
                    Student student = studentRepository.findByUser(tm.getUser()).orElse(null);
                    // Only add if not already flagged for unauthorized university
                    boolean alreadyFlagged = student != null && ineligibleMembers.stream()
                            .anyMatch(m -> m.getStudentCode().equals(student.getStudentCode()));
                    if (!alreadyFlagged) {
                        ineligibleMembers.add(new TeamRegistrationResponse.IneligibleMemberDto(
                                student != null ? student.getFullName() : tm.getUser().getUsername(),
                                student != null ? student.getStudentCode() : tm.getUser().getUsername(),
                                "Already participated in this competition"));
                    }
                }
            }
        }

        // If there are ineligible members, return warning without changing team status
        if (!ineligibleMembers.isEmpty()) {
            TeamRegistrationResponse response = new TeamRegistrationResponse();
            response.setStatus("INELIGIBLE_MEMBERS");
            response.setMessage("Some team members are not eligible to participate.");
            response.setIneligibleMembers(ineligibleMembers);
            return response;
        }

        // Check member count
        int minMembers = contest != null && contest.getMinTeamMembers() != null ? contest.getMinTeamMembers() : 3;
        int maxMembers = contest != null && contest.getMaxTeamMembers() != null ? contest.getMaxTeamMembers() : 5;

        if (approvedMemberCount < minMembers || approvedMemberCount > maxMembers) {
            throw new IllegalArgumentException(
                    "Team must have between " + minMembers + " and " + maxMembers + " approved members.");
        }

        // Tự động loại bỏ các thành viên PENDING khi team đủ điều kiện đăng ký
        allMemberships.stream()
                .filter(tm -> "PENDING".equalsIgnoreCase(tm.getStatus()))
                .forEach(tm -> teamMembershipRepository.delete(tm));

        team.setStatus("PENDING");
        if (contest != null) {
            long registeredTeams = teamRepository.countByContestIdAndStatus(contest.getId(), "APPROVED");
            if (contest.getMaximumAllowedTeams() != null && registeredTeams >= contest.getMaximumAllowedTeams()) {
                throw new IllegalArgumentException("Contest capacity has been reached.");
            }

            java.time.LocalDate now = java.time.LocalDate.now();
            boolean isWithinRegistration = true;
            if (contest.getRegistrationStart() != null && now.isBefore(contest.getRegistrationStart()))
                isWithinRegistration = false;
            if (contest.getRegistrationEnd() != null && now.isAfter(contest.getRegistrationEnd()))
                isWithinRegistration = false;
            if (isWithinRegistration) {
                team.setStatus("APPROVED");
            } else {
                throw new IllegalArgumentException("Outside of registration period.");
            }
        } else {
            team.setStatus("APPROVED");
        }
        team = teamRepository.save(team);
        String leaderInfo = request.getLeaderStudentId() != null && !request.getLeaderStudentId().isEmpty()
                ? " - Leader assigned: " + request.getLeaderStudentId()
                : "";
        auditLogService.log("REGISTER_TEAM", "Team", team.getName(), null, team.getStatus(),
                "Registered by: " + username + leaderInfo);

        // Auto-kicking from FORMING teams has been removed to allow forming teams for
        // other competitions.

        if ("APPROVED".equals(team.getStatus())) {
            String leaderStudentCode = request.getLeaderStudentId();
            if (leaderStudentCode != null && !leaderStudentCode.isEmpty()) {
                Student leaderStudent = studentRepository.findByStudentCode(leaderStudentCode).orElse(null);
                if (leaderStudent != null) {

                    List<TeamMembership> teamMembers = teamMembershipRepository.findByTeamId(team.getId());

                    for (TeamMembership tm : teamMembers) {
                        User mUser = tm.getUser();
                        if (mUser.getId().equals(leaderStudent.getUser().getId())) {
                            tm.setRole("LEADER");
                            Role leaderRole = roleRepository.findByName("LEADER")
                                    .orElseThrow(() -> new IllegalArgumentException("LEADER role missing in DB"));
                            Role studentRole = roleRepository.findByName("STUDENT")
                                    .orElseThrow(() -> new IllegalArgumentException("STUDENT role missing in DB"));

                            mUser.getRoles().remove(studentRole);
                            mUser.getRoles().add(leaderRole);
                            userRepository.save(mUser);
                        } else {
                            tm.setRole("MEMBER");
                        }
                        teamMembershipRepository.save(tm);
                    }
                }
            }
        }

        User updatedLeader = userRepository.findByUsername(username).get();
        String newToken = jwtUtils.generateToken(updatedLeader.getUsername(), "LEADER");
        TeamRegistrationResponse response = new TeamRegistrationResponse(team.getStatus(),
                "Team registration processed.");
        response.setNewToken(newToken);
        return response;
    }

    /**
     * Force-approve a team by removing ineligible members (unauthorized university
     * / already participated)
     * and setting team status to APPROVED.
     */
    @Transactional
    public TeamRegistrationResponse registerForceApprove(TeamRegistrationRequest request, String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        Team team = teamRepository.findByName(request.getTeamName())
                .stream()
                .filter(t -> {
                    List<TeamMembership> ms = teamMembershipRepository.findByTeamId(t.getId());
                    return ms.stream().anyMatch(m -> m.getUser().getId().equals(user.getId()));
                })
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Team not found"));

        Contest contest = contestRepository.findById(request.getContestId())
                .orElseThrow(() -> new IllegalArgumentException("Contest not found"));

        if (Contest.ContestStatus.CLOSED.equals(contest.getStatus())) {
            throw new IllegalArgumentException("Contest is closed and no longer accepts registrations.");
        }

        team.setContest(contest);

        List<TeamMembership> allMemberships = teamMembershipRepository.findByTeamId(team.getId());
        List<TeamMembership> approvedMembers = allMemberships.stream()
                .filter(tm -> "APPROVED".equalsIgnoreCase(tm.getStatus()))
                .toList();

        // Identify and remove ineligible members
        List<TeamMembership> toRemove = new java.util.ArrayList<>();
        for (TeamMembership tm : approvedMembers) {
            Student memberStudent = studentRepository.findByUser(tm.getUser()).orElse(null);
            boolean ineligible = false;

            // Check unauthorized university
            if (memberStudent != null) {
                try {
                    validateUniversityAllowed(memberStudent, contest);
                } catch (IllegalArgumentException e) {
                    ineligible = true;
                }
            }

            // Check already participated in this contest
            if (!ineligible) {
                List<TeamMembership> otherMemberships = teamMembershipRepository.findByUserId(tm.getUser().getId());
                for (TeamMembership other : otherMemberships) {
                    Team otherTeam = other.getTeam();
                    if (otherTeam != null && !otherTeam.getId().equals(team.getId())
                            && otherTeam.getContest() != null) {
                        if (otherTeam.getContest().getId().equals(contest.getId())) {
                            String st = otherTeam.getStatus() != null ? otherTeam.getStatus().toUpperCase() : "";
                            if ("APPROVED".equals(st) || "PENDING".equals(st)) {
                                ineligible = true;
                                break;
                            }
                        }
                    }
                }
            }

            if (ineligible) {
                toRemove.add(tm);
            }
        }

        // Remove ineligible members
        for (TeamMembership tm : toRemove) {
            teamMembershipRepository.delete(tm);
        }

        // Re-check member count after removal
        long remainingCount = approvedMembers.size() - toRemove.size();
        int minMembers = contest.getMinTeamMembers() != null ? contest.getMinTeamMembers() : 3;
        int maxMembers = contest.getMaxTeamMembers() != null ? contest.getMaxTeamMembers() : 5;
        if (remainingCount < minMembers) {
            throw new IllegalArgumentException("After removing ineligible members, the team has only " + remainingCount
                    + " member(s), which is below the minimum required (" + minMembers + ").");
        }

        // Remove PENDING members
        allMemberships.stream()
                .filter(tm -> "PENDING".equalsIgnoreCase(tm.getStatus()))
                .forEach(teamMembershipRepository::delete);

        // Validate registration period
        java.time.LocalDate now = java.time.LocalDate.now();
        if (contest.getRegistrationStart() != null && now.isBefore(contest.getRegistrationStart())) {
            throw new IllegalArgumentException("Registration period has not started yet.");
        }
        if (contest.getRegistrationEnd() != null && now.isAfter(contest.getRegistrationEnd())) {
            throw new IllegalArgumentException("Outside of registration period.");
        }

        // Assign leader role
        String leaderStudentCode = request.getLeaderStudentId();
        if (leaderStudentCode != null && !leaderStudentCode.isEmpty()) {
            Student leaderStudent = studentRepository.findByStudentCode(leaderStudentCode).orElse(null);
            if (leaderStudent != null) {
                List<TeamMembership> currentMembers = teamMembershipRepository.findByTeamId(team.getId());
                for (TeamMembership tm : currentMembers) {
                    User mUser = tm.getUser();
                    if (mUser.getId().equals(leaderStudent.getUser().getId())) {
                        tm.setRole("LEADER");
                        Role leaderRole = roleRepository.findByName("LEADER").orElseThrow();
                        Role studentRole = roleRepository.findByName("STUDENT").orElseThrow();
                        mUser.getRoles().remove(studentRole);
                        mUser.getRoles().add(leaderRole);
                        userRepository.save(mUser);
                    } else {
                        tm.setRole("MEMBER");
                    }
                    teamMembershipRepository.save(tm);
                }
            }
        }

        team.setStatus("APPROVED");
        teamRepository.save(team);

        auditLogService.log("REGISTER_TEAM_FORCE", "Team", team.getName(), "FORMING", "APPROVED",
                "Force-approved by: " + username + " (ineligible members removed: " + toRemove.size() + ")");

        // Send email notification
        List<TeamMembership> finalMembers = teamMembershipRepository.findByTeamId(team.getId());
        for (TeamMembership tm : finalMembers) {
            User memberUser = tm.getUser();
            if (memberUser != null && memberUser.getEmail() != null) {
                Student s = studentRepository.findByUser(memberUser).orElse(null);
                String fullName = s != null ? s.getFullName() : memberUser.getUsername();
                emailService.sendTeamStatusNotificationAsync(memberUser.getEmail(), fullName, team.getName(),
                        "APPROVED", null);
            }
        }

        User updatedLeader = userRepository.findByUsername(username).get();
        String newToken = jwtUtils.generateToken(updatedLeader.getUsername(), "LEADER");
        TeamRegistrationResponse resp = new TeamRegistrationResponse("APPROVED",
                "Team registered and approved successfully.");
        resp.setNewToken(newToken);
        return resp;
    }

    @Transactional(readOnly = true)
    public WorkspaceResponse getWorkspaceData(String username, Long contestId) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        List<TeamMembership> memberships = teamMembershipRepository.findByUserId(user.getId());
        if (memberships.isEmpty()) {
            throw new IllegalArgumentException("User is not in any team");
        }

        TeamMembership activeMembership = memberships.stream()
                .filter(m -> m.getTeam() != null && m.getTeam().getContest() != null)
                .filter(m -> com.fpt.shms.be.model.Contest.ContestStatus.ACTIVED
                        .equals(m.getTeam().getContest().getStatus())
                        || com.fpt.shms.be.model.Contest.ContestStatus.UPCOMING
                        .equals(m.getTeam().getContest().getStatus()))
                .filter(m -> contestId == null || m.getTeam().getContest().getId().equals(contestId))
                .max(java.util.Comparator
                        .<TeamMembership, Integer>comparing(
                                m -> "APPROVED".equalsIgnoreCase(m.getTeam().getStatus()) ? 1 : 0)
                        .thenComparing(m -> "LEADER".equalsIgnoreCase(m.getRole()) ? 1 : 0)
                        .thenComparing(m -> m.getTeam().getId()))
                .orElseGet(() -> memberships.stream()
                        .filter(m -> m.getTeam() != null && !"CLOSED".equalsIgnoreCase(m.getTeam().getStatus())
                                && (m.getTeam().getContest() == null
                                || !com.fpt.shms.be.model.Contest.ContestStatus.CLOSED
                                .equals(m.getTeam().getContest().getStatus())))
                        .filter(m -> contestId == null || (m.getTeam().getContest() != null
                                && m.getTeam().getContest().getId().equals(contestId)))
                        .max(java.util.Comparator
                                .<TeamMembership, Integer>comparing(
                                        m -> "APPROVED".equalsIgnoreCase(m.getTeam().getStatus()) ? 1 : 0)
                                .thenComparing(m -> "LEADER".equalsIgnoreCase(m.getRole()) ? 1 : 0)
                                .thenComparing(m -> m.getTeam().getId()))
                        .orElse(memberships.get(0)));
        Team team = activeMembership.getTeam();

        List<TeamMembership> teamMembers = teamMembershipRepository.findByTeamId(team.getId());
        List<Submission> submissions = submissionRepository.findByTeamId(team.getId());

        boolean isSubmitted = submissions.stream().anyMatch(s -> "SUBMITTED".equals(s.getStatus()));

        LocalDateTime deadline = null;
        Contest roundContest = team.getContest();
        if (roundContest != null) {
            List<Round> rounds = roundRepository.findByContestId(roundContest.getId());
            LocalDateTime now = LocalDateTime.now();
            LocalDateTime nearestDeadline = null;
            for (Round r : rounds) {
                if (r.getSubmissionDeadline() != null && r.getSubmissionDeadline().isAfter(now)) {
                    if (nearestDeadline == null || r.getSubmissionDeadline().isBefore(nearestDeadline)) {
                        nearestDeadline = r.getSubmissionDeadline();
                    }
                }
            }
            deadline = nearestDeadline;
        }

        int maxMembers = (roundContest != null && roundContest.getMaxTeamMembers() != null)
                ? roundContest.getMaxTeamMembers()
                : 5;

        List<WorkspaceResponse.AnnouncementDto> realAnnouncements = announcementRepository
                .findByIsActiveTrueOrderByPublishedAtDesc()
                .stream()
                .filter(a -> a.getContest() == null || a.getContest().getId().equals(team.getContest().getId()))
                .filter(a -> {
                    if (a.getTargets() == null || a.getTargets().isEmpty())
                        return true;
                    if (user.getRoles() == null || user.getRoles().isEmpty())
                        return false;
                    java.util.List<String> userRoleNames = user.getRoles().stream()
                            .map(com.fpt.shms.be.model.Role::getName).toList();
                    java.util.List<String> targetRolesList = a.getTargets().stream().map(t -> t.getRole().getName())
                            .toList();
                    return userRoleNames.stream().anyMatch(role -> targetRolesList.stream().anyMatch(t -> {
                        String targetRole = t.trim();
                        if (targetRole.equalsIgnoreCase(role))
                            return true;
                        if (targetRole.equalsIgnoreCase("STUDENT") && role.equalsIgnoreCase("LEADER"))
                            return true;
                        return false;
                    }));
                })
                .limit(5)
                .map(a -> WorkspaceResponse.AnnouncementDto.builder()
                        .id(a.getId())
                        .title(a.getTitle())
                        .subtitle(a.getContent() != null && a.getContent().length() > 60
                                ? a.getContent().substring(0, 60) + "..."
                                : a.getContent())
                        .category(a.getType() != null ? a.getType().name() : "INFO")
                        .datePosted(a.getPublishedAt())
                        .build())
                .toList();

        return WorkspaceResponse.builder()
                .teamStatus(team.getStatus() != null ? team.getStatus() : "FORMING")
                .submissionDeadline(deadline)
                .currentMembers(teamMembers.size())
                .maxMembers(maxMembers)
                .isSubmitted(isSubmitted)
                .currentRank(null)
                .announcements(realAnnouncements)
                .build();
    }

    @Transactional
    public void updateTeamStatus(Long teamId, String status, String reason) {

        Team team = teamRepository.findById(teamId)
                .orElseThrow(() -> new IllegalArgumentException("Team not found"));

        String newStatus = status.toUpperCase();
        if ("CANCELLED".equals(newStatus)) {
            newStatus = "CANCELED";
        }
        String currentStatus = team.getStatus() != null ? team.getStatus().toUpperCase() : "";

        if ("CANCELED".equals(newStatus) || "CANCELLED".equals(newStatus)) {
            if (!"APPROVED".equals(currentStatus)) {
                throw new IllegalArgumentException("Can only cancel a team that is currently approved.");
            }
        } else if ("APPROVED".equals(newStatus)) {
            if (!"CANCELED".equals(currentStatus) && !"CANCELLED".equals(currentStatus)) {
                throw new IllegalArgumentException("Can only approve a team that is currently canceled.");
            }
        }

        team.setStatus(newStatus);
        teamRepository.save(team);
        auditLogService.log("UPDATE_TEAM_STATUS", "Team", team.getName(), currentStatus, team.getStatus(),
                "Updated by admin");
        if ("CANCELLED".equalsIgnoreCase(newStatus) || "CANCELED".equalsIgnoreCase(newStatus)) {
            auditLogService.logCancelTeam(team.getName(), currentStatus, "Team status cancelled by admin");
        }

        List<TeamMembership> memberships = teamMembershipRepository.findByTeamId(team.getId());

        if ("APPROVED".equalsIgnoreCase(status)) {
            for (TeamMembership tm : memberships) {
                if ("LEADER".equalsIgnoreCase(tm.getRole())) {
                    User leader = tm.getUser();

                    Role leaderRole = roleRepository.findByName("LEADER").orElse(null);
                    Role studentRole = roleRepository.findByName("STUDENT").orElse(null);

                    if (studentRole != null) {
                        leader.getRoles().remove(studentRole);
                    }
                    if (leaderRole != null) {
                        leader.getRoles().add(leaderRole);
                    }
                    userRepository.save(leader);
                    auditLogService.logChangeUserRole(leader.getUsername(), "STUDENT", "LEADER",
                            "Promoted upon team approval");
                }
            }
        } else if ("CANCELED".equalsIgnoreCase(status) || "CANCELLED".equalsIgnoreCase(status)) {
            for (TeamMembership tm : memberships) {
                if ("LEADER".equalsIgnoreCase(tm.getRole())) {
                    User leader = tm.getUser();

                    Role leaderRole = roleRepository.findByName("LEADER").orElse(null);
                    Role studentRole = roleRepository.findByName("STUDENT").orElse(null);

                    if (leaderRole != null) {
                        leader.getRoles().remove(leaderRole);
                    }
                    if (studentRole != null) {
                        leader.getRoles().add(studentRole);
                    }
                    userRepository.save(leader);
                    auditLogService.logChangeUserRole(leader.getUsername(), "LEADER", "STUDENT",
                            "Reverted role due to team rejection/cancellation");
                }
            }
        }

        // Send email notification to all members
        for (TeamMembership tm : memberships) {
            User user = tm.getUser();
            if (user != null && user.getEmail() != null) {
                Student student = studentRepository.findByUser(user).orElse(null);
                String fullName = (student != null) ? student.getFullName() : user.getUsername();
                emailService.sendTeamStatusNotificationAsync(user.getEmail(), fullName, team.getName(), newStatus,
                        reason);
            }
        }
    }

    @Transactional(readOnly = true)
    public com.fpt.shms.be.dto.TeamRegistrationDashboardResponse getAdminTeamDashboardData() {
        List<Contest> contests = contestRepository.findAll();
        List<com.fpt.shms.be.dto.TeamRegistrationDashboardResponse.ContestData> contestDataList = new java.util.ArrayList<>();

        java.time.format.DateTimeFormatter formatter = java.time.format.DateTimeFormatter.ofPattern("MMM dd, yyyy");
        for (Contest contest : contests) {
            List<Category> categories = categoryRepository.findByContestId(contest.getId());

            List<Team> teams = teamRepository.findByContestId(contest.getId());

            int pendingReview = 0;
            int approved = 0;
            int cancelledCount = 0;
            int totalParticipants = 0;

            List<com.fpt.shms.be.dto.TeamRegistrationDashboardResponse.CategoryCapacity> capacities = new java.util.ArrayList<>();
            List<com.fpt.shms.be.dto.TeamRegistrationDashboardResponse.TeamData> teamsData = new java.util.ArrayList<>();

            int trackTeams = teams.size();

            for (Category category : categories) {
                int maxTeams = category.getContest().getMaximumAllowedTeams() != null
                        ? category.getContest().getMaximumAllowedTeams()
                        : 100;
                int capacityPercentage = (trackTeams * 100) / Math.max(1, maxTeams);

                capacities.add(com.fpt.shms.be.dto.TeamRegistrationDashboardResponse.CategoryCapacity.builder()
                        .categoryName(category.getName())
                        .percentage(Math.min(capacityPercentage, 100))
                        .build());
            }

            List<com.fpt.shms.be.dto.TeamRegistrationDashboardResponse.CategoryData> categoriesDataList = new java.util.ArrayList<>();
            for (Category category : categories) {
                categoriesDataList.add(com.fpt.shms.be.dto.TeamRegistrationDashboardResponse.CategoryData.builder()
                        .id(category.getId())
                        .name(category.getName())
                        .build());
            }

            for (Team team : teams) {
                String st = team.getStatus();
                if ("PENDING".equalsIgnoreCase(st))
                    pendingReview++;
                if ("APPROVED".equalsIgnoreCase(st))
                    approved++;
                if ("CANCELLED".equalsIgnoreCase(st) || "CANCELED".equalsIgnoreCase(st)
                        || "ELIMINATED".equalsIgnoreCase(st))
                    cancelledCount++;

                List<TeamMembership> members = teamMembershipRepository.findByTeamId(team.getId());
                if ("APPROVED".equalsIgnoreCase(st)) {
                    totalParticipants += members.size();
                }

                List<com.fpt.shms.be.dto.TeamRegistrationDashboardResponse.MemberData> memberDataList = new java.util.ArrayList<>();
                for (TeamMembership mem : members) {
                    Student student = null;
                    if (mem.getUser() != null) {
                        student = studentRepository.findByUser(mem.getUser()).orElse(null);
                    }
                    memberDataList.add(com.fpt.shms.be.dto.TeamRegistrationDashboardResponse.MemberData.builder()
                            .name(student != null ? student.getFullName()
                                    : (mem.getUser() != null ? mem.getUser().getUsername() : "Unknown"))
                            .studentId(student != null ? student.getStudentCode() : null)
                            .university(student != null && student.getUniversity() != null
                                    ? student.getUniversity().getName()
                                    : null)
                            .email(mem.getUser() != null ? mem.getUser().getEmail() : null)
                            .role(mem.getRole())
                            .status(mem.getStatus() != null ? mem.getStatus().toUpperCase() : "ACTIVE")
                            .build());
                }

                teamsData.add(com.fpt.shms.be.dto.TeamRegistrationDashboardResponse.TeamData.builder()
                        .id(team.getId())
                        .name(team.getName())
                        .track("All Categories")
                        .trackClass("track-default")
                        .date(team.getCreatedAt() != null ? team.getCreatedAt().format(formatter)
                                : LocalDateTime.now().format(formatter))
                        .status(team.getStatus() != null ? team.getStatus() : "PENDING")
                        .members(memberDataList)
                        .build());
            }

            contestDataList.add(com.fpt.shms.be.dto.TeamRegistrationDashboardResponse.ContestData.builder()
                    .id(contest.getId())
                    .name(contest.getName())
                    .status(contest.getStatus() != null ? contest.getStatus().name() : "ACTIVED")
                    .pendingReview(pendingReview)
                    .approved(approved)
                    .rejectedAndCancelled(cancelledCount)
                    .totalParticipants(totalParticipants)
                    .capacities(capacities)
                    .teams(teamsData)
                    .categories(categoriesDataList)
                    .build());
        }

        return com.fpt.shms.be.dto.TeamRegistrationDashboardResponse.builder()
                .contests(contestDataList).build();
    }

    @Transactional
    public RoundProgressResponse getRoundProgress(Long contestId, Long roundId) {
        Round round = roundRepository.findById(roundId)
                .orElseThrow(() -> new IllegalArgumentException("Round not found"));
        if (round.getContest() != null && !round.getContest().getId().equals(contestId)) {
            throw new IllegalArgumentException("Round does not belong to contest");
        }
        if (round.checkAndSyncState()) {
            roundRepository.save(round);
        }

        java.time.LocalDateTime now = java.time.LocalDateTime.now();
        String roundStatus = "CLOSED";
        String timeRemaining = "Closed";

        if (round.getSubmissionOpen() != null && round.getSubmissionDeadline() != null) {
            if (now.isBefore(round.getSubmissionOpen())) {
                roundStatus = "UPCOMING";
                java.time.Duration d = java.time.Duration.between(now, round.getSubmissionOpen());
                timeRemaining = "Opens in " + d.toDays() + "d " + (d.toHours() % 24) + "h " + (d.toMinutes() % 60)
                        + "m";
            } else if (now.isBefore(round.getSubmissionDeadline())) {
                roundStatus = "OPEN";
                java.time.Duration d = java.time.Duration.between(now, round.getSubmissionDeadline());
                timeRemaining = d.toDays() + "d " + (d.toHours() % 24) + "h " + (d.toMinutes() % 60) + "m";
            } else {
                roundStatus = "CLOSED";
                timeRemaining = "Closed";
            }
        } else {
            if (round.getState() != null) {
                roundStatus = round.getState().name();
                timeRemaining = round.getState().name();
            } else {
                roundStatus = "UPCOMING";
                timeRemaining = "Upcoming";
            }
        }

        List<Team> eligibleTeams = new java.util.ArrayList<>();
        List<Round> allRounds = roundRepository.findByContestIdOrderBySubmissionOpenAsc(contestId);
        boolean isFirstRound = allRounds.isEmpty() || allRounds.get(0).getId().equals(round.getId());

        if (isFirstRound) {
            eligibleTeams = teamRepository.findByContestId(contestId).stream()
                    .filter(t -> t != null && !"FORMING".equalsIgnoreCase(t.getStatus()))
                    .collect(java.util.stream.Collectors.toList());
        } else {
            Round prevRound = null;
            for (int i = 1; i < allRounds.size(); i++) {
                if (allRounds.get(i).getId().equals(round.getId())) {
                    prevRound = allRounds.get(i - 1);
                    break;
                }
            }
            if (prevRound != null) {
                eligibleTeams = rankingResultRepository.findQualifiedByRoundId(prevRound.getId()).stream()
                        .map(com.fpt.shms.be.model.RankingResult::getTeam)
                        .filter(t -> t != null && !"FORMING".equalsIgnoreCase(t.getStatus()))
                        .collect(java.util.stream.Collectors.toList());
            }
        }

        List<Submission> submissions = submissionRepository.findByTeamIdIn(
                eligibleTeams.stream().map(Team::getId).toList());

        int submittedCount = 0;
        int awaitingCount = 0;
        int notSubmittedCount = 0;
        List<RoundProgressResponse.TeamProgressDto> teamProgressList = new java.util.ArrayList<>();

        java.time.format.DateTimeFormatter fmt = java.time.format.DateTimeFormatter.ofPattern("MMM dd, yyyy HH:mm");

        for (Team team : eligibleTeams) {
            Submission latestSub = submissions.stream()
                    .filter(s -> s.getTeam().getId().equals(team.getId()) && s.getRound() != null
                            && s.getRound().getId().equals(round.getId()))
                    .max((s1, s2) -> s1.getVersion().compareTo(s2.getVersion()))
                    .orElse(null);

            boolean hasSubmitted = latestSub != null && ("SUBMITTED".equalsIgnoreCase(latestSub.getStatus()) ||
                    "OFFICIAL".equalsIgnoreCase(latestSub.getStatus()) ||
                    "EVALUATED".equalsIgnoreCase(latestSub.getStatus()) ||
                    "GRADED".equalsIgnoreCase(latestSub.getStatus()));
            String state = latestSub != null ? latestSub.getStatus()
                    : (roundStatus.equals("CLOSED") ? "MISSED_DEADLINE" : "Not Submitted");

            if (hasSubmitted) {
                submittedCount++;
            } else {
                if (state.equals("MISSED_DEADLINE")) {
                    notSubmittedCount++;
                } else {
                    awaitingCount++;
                }
            }

            teamProgressList.add(RoundProgressResponse.TeamProgressDto.builder()
                    .teamId(team.getId())
                    .teamName(team.getName())
                    .teamStatus(team.getStatus())
                    .submissionState(state)
                    .submissionData(latestSub != null ? latestSub.getSubmissionData() : null)
                    .submittedAt(latestSub != null && latestSub.getSubmittedAt() != null
                            ? latestSub.getSubmittedAt().format(fmt)
                            : null)
                    .build());
        }

        return RoundProgressResponse.builder()
                .roundStatus(roundStatus)
                .timeRemaining(timeRemaining)
                .totalTeams(eligibleTeams.size())
                .submittedCount(submittedCount)
                .awaitingCount(awaitingCount)
                .notSubmittedCount(notSubmittedCount)
                .submissionRequirements(round.getSubmissionRequirements())
                .teams(teamProgressList)
                .build();
    }

    private void validateUniversityAllowed(Student student, Contest contest) {
        if (contest == null || student == null || student.getUniversity() == null) {
            return;
        }
        List<ContestUniversity> allowedList = contestUniversityRepository.findByContestId(contest.getId());
        if (allowedList != null && !allowedList.isEmpty()) {
            boolean isAllowed = allowedList.stream()
                    .anyMatch(cu -> cu.getUniversity().getId().equals(student.getUniversity().getId()));
            if (!isAllowed) {
                throw new IllegalArgumentException("Member " + student.getFullName() + " (University: "
                        + student.getUniversity().getName() + ") is not authorized to participate in this contest.");
            }
        }
    }

    private Student requireStudent(User user) {
        return studentRepository.findByUser(user)
                .orElseThrow(() -> new IllegalArgumentException("User is not a registered student."));
    }

    /**
     * Tìm kiếm sinh viên theo mã sinh viên hoặc email.
     */
    @Transactional(readOnly = true)
    public java.util.List<java.util.Map<String, Object>> searchStudents(String keyword) {
        java.util.List<Student> students = studentRepository.searchByCodeOrEmail(keyword);
        return students.stream().map(s -> {
            java.util.Map<String, Object> map = new java.util.HashMap<>();
            map.put("userId", s.getId());
            map.put("fullName", s.getFullName());
            map.put("studentCode", s.getStudentCode());
            map.put("email", s.getCorporateEmail());
            map.put("universityId", s.getUniversity() != null ? s.getUniversity().getId() : null);
            map.put("universityName", s.getUniversity() != null ? s.getUniversity().getName() : "N/A");
            return map;
        }).toList();
    }

    /**
     * Gửi lời mời tham gia đội. Mọi thành viên APPROVED đều có quyền mời.
     */
    @Transactional
    public java.util.Map<String, Object> sendInvitation(com.fpt.shms.be.dto.InvitationRequest request,
                                                        String username) {
        User inviter = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        Team team = teamRepository.findById(request.getTeamId())
                .orElseThrow(() -> new IllegalArgumentException("Team not found"));

        // Validate: người gửi phải là thành viên APPROVED
        java.util.List<TeamMembership> teamMemberships = teamMembershipRepository.findByTeamId(team.getId());
        boolean isApprovedMember = teamMemberships.stream()
                .anyMatch(tm -> tm.getStudent().getId().equals(inviter.getId())
                        && "APPROVED".equalsIgnoreCase(tm.getStatus()));
        if (!isApprovedMember) {
            throw new IllegalArgumentException("You must be an approved team member to send invitations.");
        }

        // Validate: không thể tự mời chính mình
        if (request.getStudentUserId().equals(inviter.getId())) {
            throw new IllegalArgumentException("You cannot invite yourself.");
        }

        // Validate: người được mời chưa có trong team (APPROVED hoặc PENDING)
        boolean alreadyInTeam = teamMemberships.stream()
                .anyMatch(tm -> tm.getStudent().getId().equals(request.getStudentUserId())
                        && ("APPROVED".equalsIgnoreCase(tm.getStatus()) || "PENDING".equalsIgnoreCase(tm.getStatus())));
        if (alreadyInTeam) {
            throw new IllegalArgumentException("This student is already in the team or has a pending invitation.");
        }

        // Removed validation that blocks inviting a user if they are in any registered
        // team.
        // Users can be in multiple teams as long as they are for different contests.

        // Validate capacity: đếm APPROVED + PENDING
        Contest contest = team.getContest();
        int maxCapacity = (contest != null && contest.getMaxTeamMembers() != null)
                ? contest.getMaxTeamMembers()
                : 5;
        long currentCount = teamMembershipRepository.countByTeamIdAndStatusIn(team.getId(),
                java.util.List.of("APPROVED", "PENDING"));
        if (currentCount >= maxCapacity) {
            throw new IllegalArgumentException("The team has reached the maximum capacity allowed for this contest.");
        }

        // Validate: sinh viên chưa có trong đội khác cùng Contest
        if (contest != null) {
            java.util.List<TeamMembership> existing = teamMembershipRepository
                    .findByUserIdAndContestIdAndStatusIn(request.getStudentUserId(), contest.getId(),
                            java.util.List.of("APPROVED", "PENDING"));
            if (!existing.isEmpty()) {
                throw new IllegalArgumentException("This student is already in another team for this contest.");
            }
        }

        // Tìm student được mời
        Student invitedStudent = studentRepository.findById(request.getStudentUserId())
                .orElseThrow(() -> new IllegalArgumentException("Student not found"));

        // Tạo TeamMembership mới với invitation token (invite code ngắn gọn)
        String token = java.util.UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        TeamMembership membership = TeamMembership.builder()
                .team(team)
                .user(invitedStudent.getUser())
                .role("MEMBER")
                .status("PENDING")
                .invitationToken(token)
                .inviterUserId(inviter.getId())
                .build();
        teamMembershipRepository.save(membership);
        auditLogService.log("SEND_INVITATION", "TeamMembership",
                team.getName() + " -> " + invitedStudent.getStudentCode(), null, "PENDING",
                "Invited user " + request.getStudentUserId() + " to team " + team.getName());

        if (invitedStudent.getCorporateEmail() != null) {
            emailService.sendTeamInvitationEmailAsync(
                    invitedStudent.getCorporateEmail(),
                    invitedStudent.getFullName(),
                    inviter.getFullName(),
                    team.getName(),
                    token);
        }

        java.util.Map<String, Object> result = new java.util.HashMap<>();
        result.put("invitationToken", token);
        result.put("message", "Invitation sent successfully.");
        return result;
    }

    /**
     * Phản hồi lời mời: ACCEPT hoặc REJECT.
     */
    @Transactional
    public java.util.Map<String, Object> respondToInvitation(com.fpt.shms.be.dto.InvitationRespondRequest request,
                                                             String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        if ("ACCEPT".equalsIgnoreCase(request.getAction())) {
            // Removed validation that blocks accepting an invitation if the user is in any
            // registered team.
            // Users can be in multiple teams as long as they are for different contests.
        }

        java.util.Optional<TeamMembership> membershipOpt = teamMembershipRepository
                .findByInvitationToken(request.getInvitationToken());

        if (membershipOpt.isEmpty()) {
            java.util.Optional<Team> teamOpt = teamRepository.findByTeamCode(request.getInvitationToken());
            if (teamOpt.isPresent() && "ACCEPT".equalsIgnoreCase(request.getAction())) {
                Team team = teamOpt.get();

                // Prevent joining if team is already registered (PENDING or APPROVED)
                if ("APPROVED".equalsIgnoreCase(team.getStatus()) || "PENDING".equalsIgnoreCase(team.getStatus())) {
                    throw new IllegalArgumentException(
                            "You cannot join this team because it has already been officially registered.");
                }

                // Validate capacity (chỉ đếm APPROVED giống như phần ACCEPT bên dưới)
                Contest contest = team.getContest();
                int maxCapacity = (contest != null && contest.getMaxTeamMembers() != null)
                        ? contest.getMaxTeamMembers()
                        : 5;
                long approvedCount = teamMembershipRepository.countByTeamIdAndStatusIn(team.getId(),
                        java.util.List.of("APPROVED"));
                if (approvedCount >= maxCapacity) {
                    throw new IllegalArgumentException("Unfortunate! The team is already full.");
                }

                // Check if user is already in this team
                boolean alreadyInTeam = teamMembershipRepository.findByTeamId(team.getId()).stream()
                        .anyMatch(tm -> tm.getUser().getId().equals(user.getId()));
                if (alreadyInTeam) {
                    throw new IllegalArgumentException("You are already in the team");
                }

                // Validate: sinh viên chưa có trong đội khác cùng Contest
                if (contest != null) {
                    java.util.List<TeamMembership> existing = teamMembershipRepository
                            .findByUserIdAndContestIdAndStatusIn(user.getId(), contest.getId(),
                                    java.util.List.of("APPROVED", "PENDING"));
                    if (!existing.isEmpty()) {
                        throw new IllegalArgumentException("You are already in another team for this contest.");
                    }
                }

                // Create membership
                TeamMembership newMembership = TeamMembership.builder()
                        .team(team)
                        .user(user)
                        .role("MEMBER")
                        .status("APPROVED")
                        .joinedAt(java.time.LocalDateTime.now())
                        .build();
                teamMembershipRepository.save(newMembership);

                java.util.Map<String, Object> result = new java.util.HashMap<>();
                result.put("message", "Invitation accepted. You are now a team member.");
                return result;
            } else {
                throw new IllegalArgumentException("Invalid invitation token or team code.");
            }
        }

        TeamMembership membership = membershipOpt.get();

        // Validate token thuộc về user đang đăng nhập
        if (!membership.getStudent().getId().equals(user.getId())) {
            throw new org.springframework.security.access.AccessDeniedException(
                    "This invitation token does not belong to your account.");
        }

        if (!"PENDING".equalsIgnoreCase(membership.getStatus())) {
            throw new IllegalArgumentException("This invitation has already been processed.");
        }

        java.util.Map<String, Object> result = new java.util.HashMap<>();

        if ("ACCEPT".equalsIgnoreCase(request.getAction())) {
            // Re-check capacity (chỉ đếm APPROVED)
            Team team = membership.getTeam();
            Contest contest = team.getContest();
            int maxCapacity = (contest != null && contest.getMaxTeamMembers() != null)
                    ? contest.getMaxTeamMembers()
                    : 5;
            long approvedCount = teamMembershipRepository.countByTeamIdAndStatusIn(team.getId(),
                    java.util.List.of("APPROVED"));
            if (approvedCount >= maxCapacity) {
                throw new IllegalArgumentException("Unfortunate! The team is already full.");
            }
            membership.setStatus("APPROVED");
            membership.setInvitationToken(null);
            membership.setJoinedAt(java.time.LocalDateTime.now());
            result.put("message", "Invitation accepted. You are now a team member.");
        } else if ("REJECT".equalsIgnoreCase(request.getAction())) {
            membership.setStatus("REJECTED");
            membership.setInvitationToken(null);
            result.put("message", "Invitation rejected.");
        } else {
            throw new IllegalArgumentException("Invalid action. Must be ACCEPT or REJECT.");
        }

        teamMembershipRepository.save(membership);
        auditLogService.log("RESPOND_INVITATION", "TeamMembership",
                membership.getTeam() != null ? membership.getTeam().getName() : "Team", "PENDING",
                membership.getStatus(), "Action: " + request.getAction());

        return result;
    }

    /**
     * Lấy danh sách lời mời PENDING cho user hiện tại.
     */
    @Transactional(readOnly = true)
    public java.util.List<java.util.Map<String, Object>> getPendingInvitations(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        java.util.List<TeamMembership> pending = teamMembershipRepository.findPendingInvitationsByUserId(user.getId());

        return pending.stream().map(tm -> {
            java.util.Map<String, Object> map = new java.util.HashMap<>();
            map.put("invitationToken", tm.getInvitationToken());
            map.put("teamId", tm.getTeam().getId());
            map.put("teamName", tm.getTeam().getName());
            map.put("contestName", tm.getTeam().getContest() != null ? tm.getTeam().getContest().getName() : "N/A");
            map.put("inviterUserId", tm.getInviterUserId());
            if (tm.getInviterUserId() != null) {
                userRepository.findById(tm.getInviterUserId()).ifPresent(inviterUser -> {
                    map.put("inviterName", inviterUser.getFullName());
                });
            }
            map.put("joinedAt", tm.getJoinedAt());
            return map;
        }).toList();
    }

    @Transactional
    public void applyPenaltyToTeam(com.fpt.shms.be.dto.ApplyPenaltyRequest request) {
        Team team = teamRepository.findById(request.getTeamId())
                .orElseThrow(() -> new IllegalArgumentException("Team not found"));

        try {
            com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
            java.util.Map<String, String> details = new java.util.HashMap<>();
            details.put("rule", request.getPenaltyRule());
            details.put("penalty", request.getPenaltyApplied());
            details.put("note", request.getPenaltyNote());
            details.put("appliedAt", java.time.LocalDateTime.now().toString());

            java.util.List<java.util.Map<String, String>> existingList = new java.util.ArrayList<>();
            if (team.getPenaltyDetails() != null && !team.getPenaltyDetails().isBlank()) {
                existingList = mapper.readValue(team.getPenaltyDetails(),
                        new com.fasterxml.jackson.core.type.TypeReference<java.util.List<java.util.Map<String, String>>>() {
                        });
            }
            existingList.add(details);
            team.setPenaltyDetails(mapper.writeValueAsString(existingList));
            teamRepository.save(team);

            auditLogService.log("APPLY_PENALTY", "Team", team.getName(), null, request.getPenaltyApplied(),
                    "Penalty applied for rule: " + request.getPenaltyRule());
        } catch (Exception e) {
            throw new RuntimeException("Error processing penalty details", e);
        }
    }
}
