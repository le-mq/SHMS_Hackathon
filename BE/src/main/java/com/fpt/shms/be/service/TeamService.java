package com.fpt.shms.be.service;

import com.fpt.shms.be.dto.*;
import com.fpt.shms.be.model.*;
import com.fpt.shms.be.repository.*;
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

    @Transactional
    public Team createTeam(CreateTeamRequest request, String leaderUsername) {
        User leader = userRepository.findByUsername(leaderUsername)
                .orElseThrow(() -> new IllegalArgumentException("Leader user not found"));

        Category category = null;
        if (request.getCategoryId() != null) {
            category = categoryRepository.findById(request.getCategoryId()).orElse(null);
        }
        if (category == null) {
            List<Category> allCategories = categoryRepository.findAll();
            if (allCategories.isEmpty()) {
                throw new IllegalArgumentException("No categories available in the system.");
            }
            category = allCategories.get(0);
        }

        Team team = Team.builder()
                .name(request.getTeamName())
                .contest(category.getContest())
                .build();
        team.setCategory(category);
        team.generateInvitationCode();
        team = teamRepository.save(team);

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
            if ("PENDING".equals(tm.getStatus()) || "APPROVED".equals(tm.getStatus())) {
                throw new IllegalArgumentException("You are already part of a team or have a pending request.");
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
    }

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
                Contest c = t.getContest() != null ? t.getContest() : (t.getCategory() != null ? t.getCategory().getContest() : null);
                if (c != null && c.getId().equals(contestId)) {
                    team = t;
                    break;
                }
            }
        } else {
            java.time.LocalDate now = java.time.LocalDate.now();
            for (TeamMembership m : memberships) {
                Team t = m.getTeam();
                Contest c = t.getContest() != null ? t.getContest() : (t.getCategory() != null ? t.getCategory().getContest() : null);
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

        if (roster.size() < 3 && "APPROVED".equals(team.getStatus())) {
        }

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
                .categoryName(team.getCategory() != null ? team.getCategory().getName() : "No Category")
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
        if (request.getCategoryId() != null) {
            Category cat = categoryRepository.findById(request.getCategoryId()).orElseThrow(() -> new IllegalArgumentException("Category not found"));
            team.setCategory(cat);
        }

        Contest contest = null;
        if (request.getContestId() != null) {
            contest = contestRepository.findById(request.getContestId()).orElseThrow(() -> new IllegalArgumentException("Contest not found"));
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

        if ("APPROVED".equals(team.getStatus())) {
            String leaderMssv = request.getLeaderStudentId();
            if (leaderMssv != null && !leaderMssv.isEmpty()) {
                Student leaderStudent = studentRepository.findByMssv(leaderMssv).orElse(null);
                if (leaderStudent != null) {
                    List<TeamMembership> teamMembers = teamMembershipRepository.findByTeamId(team.getId());
                    for (TeamMembership tm : teamMembers) {
                        User mUser = tm.getUser();
                        if (mUser.getId().equals(leaderStudent.getUser().getId())) {
                            tm.setRole("LEADER");

                            Role teamLeaderRole = roleRepository.findByName("TEAM_LEADER")
                                    .orElseGet(() -> roleRepository.save(Role.builder().name("TEAM_LEADER").build()));
                            Role teamMemberRole = roleRepository.findByName("TEAM_MEMBER").orElse(null);

                            if (teamMemberRole != null) {
                                mUser.getRoles().remove(teamMemberRole);
                            }
                            mUser.getRoles().add(teamLeaderRole);
                            userRepository.save(mUser);
                        } else {
                            tm.setRole("MEMBER");
                            Role teamMemberRole = roleRepository.findByName("TEAM_MEMBER")
                                    .orElseGet(() -> roleRepository.save(Role.builder().name("TEAM_MEMBER").build()));
                            Role teamLeaderRole = roleRepository.findByName("TEAM_LEADER").orElse(null);

                            if (teamLeaderRole != null) {
                                mUser.getRoles().remove(teamLeaderRole);
                            }
                            mUser.getRoles().add(teamMemberRole);
                            userRepository.save(mUser);
                        }
                        teamMembershipRepository.save(tm);
                    }
                }
            }
        }
        return new TeamRegistrationResponse(team.getStatus(), "Team registration processed.");
    }

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
        Contest roundContest = team.getContest() != null ? team.getContest()
                : (team.getCategory() != null ? team.getCategory().getContest() : null);
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
        if (team.getContest() != null && team.getContest().getMaximumAllowedTeams() != null) {
        }

        return WorkspaceResponse.builder()
                .teamStatus(team.getStatus() != null ? team.getStatus() : "FORMING")
                .submissionDeadline(deadline)
                .currentMembers(teamMembers.size())
                .maxMembers(maxMembers)
                .isSubmitted(isSubmitted)
                .currentRank(isSubmitted ? 12 : null) // Keep mock rank
                .announcements(List.of(
                        WorkspaceResponse.AnnouncementDto.builder()
                                .id(1L)
                                .title("Tournament Schedule Update")
                                .subtitle("Final presentation slots have been randomized.")
                                .category("Schedule")
                                .datePosted(LocalDateTime.now().minusHours(2))
                                .build(),
                        WorkspaceResponse.AnnouncementDto.builder()
                                .id(2L)
                                .title("Workshop: Scaling with JWT")
                                .subtitle("Guest lecture starts in 2 hours at Hall A.")
                                .category("Workshop")
                                .datePosted(LocalDateTime.now().minusHours(4))
                                .build()
                ))
                .build();
    }

    @Transactional
    public void updateTeamStatus(Long teamId, String status) {

        Team team = teamRepository.findById(teamId)
                .orElseThrow(() -> new IllegalArgumentException("Team not found"));

        team.setStatus(status.toUpperCase());
        teamRepository.save(team);

        if("APPROVED".equalsIgnoreCase(status)) {
            List<TeamMembership> memberships = teamMembershipRepository.findByTeamId(team.getId());
            for (TeamMembership tm : memberships) {
                if("LEADER".equalsIgnoreCase(tm.getRole())) {
                    User leader = tm.getUser();

                    Role teamLeaderRole = roleRepository.findByName("TEAM_LEADER")
                            .orElseGet(() -> roleRepository.save(Role.builder().name("TEAM_LEADER").build()));
                    Role teamMemberRole = roleRepository.findByName("TEAM_MEMBER").orElse(null);

                    if(teamMemberRole != null) {
                        leader.getRoles().remove(teamMemberRole);
                    }
                    leader.getRoles().add(teamLeaderRole);
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

            int pendingReview = 0;
            int approved = 0;
            int totalParticipants = 0;

            List<com.fpt.shms.be.dto.TeamRegistrationDashboardResponse.CategoryCapacity> capacities = new java.util.ArrayList<>();
            List<com.fpt.shms.be.dto.TeamRegistrationDashboardResponse.TeamData> teamsData = new java.util.ArrayList<>();

            for (Category category : categories) {
                List<Team> teams = teamRepository.findByCategoryId(category.getId());

                int trackTeams = teams.size();
                int maxTeams = category.getContest().getMaximumAllowedTeams() != null ? category.getContest().getMaximumAllowedTeams() : 100; // rough estimate if no limit
                int capacityPercentage = (trackTeams * 100) / Math.max(1, maxTeams);

                capacities.add(com.fpt.shms.be.dto.TeamRegistrationDashboardResponse.CategoryCapacity.builder()
                        .categoryName(category.getName())
                        .percentage(Math.min(capacityPercentage, 100))
                        .build());

                for (Team team : teams) {
                    if ("PENDING".equals(team.getStatus())) pendingReview++;
                    if ("APPROVED".equals(team.getStatus())) approved++;

                    List<TeamMembership> members = teamMembershipRepository.findByTeamId(team.getId());
                    if ("APPROVED".equals(team.getStatus())) {
                        totalParticipants += members.size();
                    }

                    String trackClass = "track-default";
                    if (category.getName().toLowerCase().contains("fintech") || category.getName().toLowerCase().contains("ai")) trackClass = "track-fintech";
                    else if (category.getName().toLowerCase().contains("cyber")) trackClass = "track-cyber";
                    else if (category.getName().toLowerCase().contains("sustain")) trackClass = "track-sust";

                    teamsData.add(com.fpt.shms.be.dto.TeamRegistrationDashboardResponse.TeamData.builder()
                            .id(team.getId())
                            .name(team.getName())
                            .track(category.getName())
                            .trackClass(trackClass)
                            .date(LocalDateTime.now().format(formatter)) // Real creation date usually, but we don't have it in Team model right now, mock to now
                            .status(team.getStatus() != null ? team.getStatus() : "PENDING")
                            .build());
                }
            }

            contestDataList.add(com.fpt.shms.be.dto.TeamRegistrationDashboardResponse.ContestData.builder()
                    .id(contest.getId())
                    .name(contest.getName())
                    .pendingReview(pendingReview)
                    .approved(approved)
                    .totalParticipants(totalParticipants)
                    .capacities(capacities)
                    .teams(teamsData)
                    .build());
        }

        return com.fpt.shms.be.dto.TeamRegistrationDashboardResponse.builder()
                .contests(contestDataList).build();
    }

    private Student requireStudent(User user) {
        return studentRepository.findByUser(user)
                .orElseThrow(() -> new IllegalArgumentException("Student profile not found"));
    }
}
