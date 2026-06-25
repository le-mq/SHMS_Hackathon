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
public class TeamService{
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

    @Transactional
    public Team createTeam(CreateTeamRequest request, String leaderUsername) {
        User leader = userRepository.findByUsername(leaderUsername)
                .orElseThrow(() -> new IllegalArgumentException("Leader user not found"));

        Team team = Team.builder()
                .name(request.getTeamName())
                .build();
        team.generateInvitationCode();
        team = teamRepository.save(team);
        auditLogService.log("CREATE_TEAM", "Team", team.getId(), null, team.getStatus(), "Leader: " + leaderUsername);

        TeamMembership memberMembership = TeamMembership.builder()
                .team(team)
                .student(requireStudent(leader))
                .role("MEMBER")
                .status("APPROVED")
                .build();
        teamMembershipRepository.save(memberMembership);

        return team;
    }

    @Transactional
    public void joinTeam(String invitationCode, String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        List<TeamMembership> existingMemberships = teamMembershipRepository.findByUserId(user.getId());
        for (TeamMembership tm : existingMemberships) {
            if (("PENDING".equals(tm.getStatus()) || "APPROVED".equals(tm.getStatus()))
                    && !"CLOSED".equals(tm.getTeam().getStatus())) {
                throw new IllegalArgumentException("You are already part of an active team or have a pending request.");
            }
        }
        Team team = teamRepository.findByInvitationCode(invitationCode)
                .orElseThrow(() -> new IllegalArgumentException("Invalid invitation code"));

        if ("APPROVED".equals(team.getStatus()) || "PENDING".equals(team.getStatus())) {
            throw new IllegalArgumentException("The team has already been approved and cannot accept new members.");
        }

        List<TeamMembership> currentMembers = teamMembershipRepository.findByTeamId(team.getId());
        if (currentMembers.size() >= 5) {
            throw new IllegalArgumentException("Team has already reached the maximum limit of 5 members.");
        }
        TeamMembership newMember = TeamMembership.builder()
                .team(team)
                .student(requireStudent(user))
                .role("MEMBER")
                .status("APPROVED")
                .build();
        teamMembershipRepository.save(newMember);
        auditLogService.log("JOIN_TEAM", "Team", team.getId(), null, team.getStatus(), "User: " + username);
    }

    @Transactional(readOnly = true)
    public TeamStatusResponse getTeamStatus(String username, Long contestId) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        List<TeamMembership> memberships = teamMembershipRepository.findByUserId(user.getId());
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
                    if (Contest.ContestStatus.ACTIVE.equals(c.getStatus())) {
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
                team = memberships.get(0).getTeam();
            }
        }

        if (team == null) {
            throw new IllegalArgumentException("No team found for the selected contest");
        }

        List<TeamMembership> roster = teamMembershipRepository.findByTeamId(team.getId());

        List<TeamStatusResponse.MemberDto> memberDtos = roster.stream().map(m -> {
            Student student = studentRepository.findByUser(m.getUser()).orElse(null);
            return TeamStatusResponse.MemberDto.builder()
                    .fullName(student != null ? student.getFullName() : m.getUser().getUsername())
                    .studentId(student != null ? student.getStudentId() : "N/A")
                    .email(student != null ? student.getCorporateEmail() : "N/A")
                    .internalRole(m.getRole())
                    .build();
        }).toList();

        return TeamStatusResponse.builder()
                .teamName(team.getName())
                .categoryName("All Categories")
                .invitationCode(team.getInvitationCode())
                .status(team.getStatus())
                .roster(memberDtos)
                .build();
    }

    @Transactional
    public void leaveTeam(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        List<TeamMembership> memberships = teamMembershipRepository.findByUserId(user.getId());
        if (memberships.isEmpty()) {
            throw new IllegalArgumentException("You are not currently in any team.");
        }

        TeamMembership membership = memberships.get(0);
        Team team = membership.getTeam();

        if ("PENDING".equals(team.getStatus()) || "APPROVED".equals(team.getStatus())) {
            throw new IllegalArgumentException("Cannot leave team while registration is pending or approved.");
        }

        teamMembershipRepository.delete(membership);
        auditLogService.log("LEAVE_TEAM", "Team", team.getId(), null, team.getStatus(), "User: " + username);
    }

    @Transactional
    public TeamRegistrationResponse registerOfficialTeam(TeamRegistrationRequest request, String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        List<TeamMembership> memberships = teamMembershipRepository.findByUserId(user.getId());
        if (memberships.isEmpty()) {
            throw new IllegalArgumentException("User is not in any team");
        }

        Team team = memberships.get(0).getTeam();

        if ("PENDING".equals(team.getStatus()) || "APPROVED".equals(team.getStatus())) {
            throw new IllegalArgumentException("Team registration is already pending or approved.");
        }

        team.setName(request.getTeamName());
        Contest contest = null;
        if (request.getContestId() != null) {
            contest = contestRepository.findById(request.getContestId()).orElseThrow(() -> new IllegalArgumentException("Contest not found"));

            if (Contest.ContestStatus.CLOSED.equals(contest.getStatus())) {
                throw new IllegalArgumentException("Contest is closed and no longer accepts registrations.");
            }
            team.setContest(contest);
        }

        long memberCount = teamMembershipRepository.countByTeamId(team.getId());
        if (memberCount < 3 || memberCount > 5) {
            team.setStatus("REJECTED");
            teamRepository.save(team);
            return new TeamRegistrationResponse("REJECTED", "Team must have between 3 and 5 members.");
        }

        team.setStatus("PENDING");
        if (contest != null) {
            long registeredTeams = teamRepository.countByContestIdAndStatus(contest.getId(), "APPROVED");
            if (contest.getMaximumAllowedTeams() != null && registeredTeams >= contest.getMaximumAllowedTeams()) {
                team.setStatus("REJECTED");
                teamRepository.save(team);
                return new TeamRegistrationResponse("REJECTED", "Contest capacity has been reached.");
            }

            java.time.LocalDate now = java.time.LocalDate.now();
            boolean isWithinRegistration = true;
            if (contest.getRegistrationStart() != null && now.isBefore(contest.getRegistrationStart())) isWithinRegistration = false;
            if (contest.getRegistrationEnd() != null && now.isAfter(contest.getRegistrationEnd())) isWithinRegistration = false;
            if (isWithinRegistration) {
                team.setStatus("APPROVED");
            } else {
                team.setStatus("REJECTED");
                teamRepository.save(team);
                return new TeamRegistrationResponse("REJECTED", "Outside of registration period.");
            }
        } else {
            team.setStatus("APPROVED");
        }
        team = teamRepository.save(team);
        auditLogService.log("REGISTER_TEAM", "Team", team.getId(), null, team.getStatus(), "Registered by: " + username);

        if ("APPROVED".equals(team.getStatus())) {
            String leaderStudentCode = request.getLeaderStudentId();
            if (leaderStudentCode != null && !leaderStudentCode.isEmpty()) {
                Student leaderStudent = studentRepository.findByStudentCode(leaderStudentCode).orElse(null);
                if (leaderStudent != null) {

                    List<TeamMembership> teamMembers = teamMembershipRepository.findByTeamId(team.getId());

                    for (TeamMembership tm : teamMembers) {
                        Student memberStudent = requireStudent(tm.getUser());
                        validateUniversityAllowed(memberStudent, team.getContest());
                    }

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
        TeamRegistrationResponse response = new TeamRegistrationResponse(team.getStatus(), "Team registration processed.");
        response.setNewToken(newToken);
        return response;
    }

    @Transactional(readOnly = true)
    public WorkspaceResponse getWorkspaceData(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        List<TeamMembership> memberships = teamMembershipRepository.findByUserId(user.getId());
        if (memberships.isEmpty()) {
            throw new IllegalArgumentException("User is not in any team");
        }

        TeamMembership activeMembership = memberships.get(0);
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

        int maxMembers = 5;

        List<WorkspaceResponse.AnnouncementDto> realAnnouncements = announcementRepository
                .findByIsActiveTrueOrderByPublishedAtDesc()
                .stream()
                .filter(a -> a.getContest() == null || a.getContest().getId().equals(team.getContest().getId()))
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
    public void updateTeamStatus(Long teamId, String status) {

        Team team = teamRepository.findById(teamId)
                .orElseThrow(() -> new IllegalArgumentException("Team not found"));

        String newStatus = status.toUpperCase();
        String currentStatus = team.getStatus() != null ? team.getStatus().toUpperCase() : "";

        if ("CANCELED".equals(newStatus) || "CANCELLED".equals(newStatus) || "REJECTED".equals(newStatus)) {
            if (!"APPROVED".equals(currentStatus)) {
                throw new IllegalArgumentException("Can only cancel a team that is currently approved.");
            }
        } else if ("APPROVED".equals(newStatus)) {
            if (!"CANCELED".equals(currentStatus) && !"CANCELLED".equals(currentStatus) && !"REJECTED".equals(currentStatus)) {
                throw new IllegalArgumentException("Can only approve a team that is currently canceled.");
            }
        }

        team.setStatus(newStatus);
        teamRepository.save(team);
        auditLogService.log("UPDATE_TEAM_STATUS", "Team", team.getId(), null, team.getStatus(), "Updated by admin");

        if("APPROVED".equalsIgnoreCase(status)) {
            List<TeamMembership> memberships = teamMembershipRepository.findByTeamId(team.getId());
            for (TeamMembership tm : memberships) {
                if("LEADER".equalsIgnoreCase(tm.getRole())) {
                    User leader = tm.getUser();

                    Role leaderRole = roleRepository.findByName("LEADER").orElse(null);
                    Role studentRole = roleRepository.findByName("STUDENT").orElse(null);

                    if(studentRole != null) {
                        leader.getRoles().remove(studentRole);
                    }
                    if(leaderRole != null) {
                        leader.getRoles().add(leaderRole);
                    }
                    userRepository.save(leader);

                }
            }
        } else if ("CANCELLED".equalsIgnoreCase(status) || "REJECTED".equalsIgnoreCase(status)) {
            List<TeamMembership> memberships = teamMembershipRepository.findByTeamId(team.getId());
            for (TeamMembership tm : memberships) {
                if("LEADER".equalsIgnoreCase(tm.getRole())) {
                    User leader = tm.getUser();

                    Role leaderRole = roleRepository.findByName("LEADER").orElse(null);
                    Role studentRole = roleRepository.findByName("STUDENT").orElse(null);

                    if(leaderRole != null) {
                        leader.getRoles().remove(leaderRole);
                    }
                    if(studentRole != null) {
                        leader.getRoles().add(studentRole);
                    }
                    userRepository.save(leader);
                }
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
            int rejectedAndCancelled = 0;
            int totalParticipants = 0;

            List<com.fpt.shms.be.dto.TeamRegistrationDashboardResponse.CategoryCapacity> capacities = new java.util.ArrayList<>();
            List<com.fpt.shms.be.dto.TeamRegistrationDashboardResponse.TeamData> teamsData = new java.util.ArrayList<>();

            int trackTeams = teams.size();

            for (Category category : categories) {
                int maxTeams = category.getContest().getMaximumAllowedTeams() != null ? category.getContest().getMaximumAllowedTeams() : 100;
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
                if ("PENDING".equals(team.getStatus())) pendingReview++;
                if ("APPROVED".equals(team.getStatus())) approved++;
                if ("CANCELLED".equals(team.getStatus()) || "REJECTED".equals(team.getStatus())) rejectedAndCancelled++;

                List<TeamMembership> members = teamMembershipRepository.findByTeamId(team.getId());
                if ("APPROVED".equals(team.getStatus())) {
                    totalParticipants += members.size();
                }

                teamsData.add(com.fpt.shms.be.dto.TeamRegistrationDashboardResponse.TeamData.builder()
                        .id(team.getId())
                        .name(team.getName())
                        .track("All Categories")
                        .trackClass("track-default")
                        .date(team.getCreatedAt() != null ? team.getCreatedAt().format(formatter) : LocalDateTime.now().format(formatter))
                        .status(team.getStatus() != null ? team.getStatus() : "PENDING")
                        .build());
            }

            contestDataList.add(com.fpt.shms.be.dto.TeamRegistrationDashboardResponse.ContestData.builder()
                    .id(contest.getId())
                    .name(contest.getName())
                    .pendingReview(pendingReview)
                    .approved(approved)
                    .rejectedAndCancelled(rejectedAndCancelled)
                    .totalParticipants(totalParticipants)
                    .capacities(capacities)
                    .teams(teamsData)
                    .categories(categoriesDataList)
                    .build());
        }

        return com.fpt.shms.be.dto.TeamRegistrationDashboardResponse.builder()
                .contests(contestDataList).build();
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
                throw new IllegalArgumentException("Your university is not authorized to participate in this contest.");
            }
        }
    }

    private Student requireStudent(User user) {
        return studentRepository.findByUser(user)
                .orElseThrow(() -> new IllegalArgumentException("User is not a registered student."));
    }

}