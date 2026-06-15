package com.fpt.shms.be.service;

import com.fpt.shms.be.dto.CreateTeamRequest;
import com.fpt.shms.be.dto.TeamRegistrationRequest;
import com.fpt.shms.be.dto.TeamRegistrationResponse;
import com.fpt.shms.be.dto.TeamStatusResponse;
import com.fpt.shms.be.model.*;
import com.fpt.shms.be.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
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

    public TeamStatusResponse getTeamStatus(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        List<TeamMembership> memberships = teamMembershipRepository.findByUserId(user.getId());
        if (memberships.isEmpty()) {
            throw new IllegalArgumentException("User is not in any team");
        }

        Team team = memberships.get(0).getTeam();
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
                .categoryName(team.getCategory().getName())
                .invitationCode(team.getInvitationCode())
                .status(team.getStatus())
                .roster(memberDtos)
                .build();
    }

    @Transactional
    public void updateTeamStatus(Long teamId, String status) {
        Team team = teamRepository.findById(teamId)
                .orElseThrow(() -> new IllegalArgumentException("Team not found"));

        team.setStatus(status.toUpperCase());
        teamRepository.save(team);

        if ("APPROVED".equalsIgnoreCase(status)) {
            List<TeamMembership> memberships = teamMembershipRepository.findByTeamId(team.getId());
            for (TeamMembership tm : memberships) {
                if ("LEADER".equalsIgnoreCase(tm.getRole())) {
                    User leader = tm.getUser();

                    Role teamLeaderRole = roleRepository.findByName("TEAM_LEADER")
                            .orElseGet(() -> roleRepository.save(Role.builder().name("TEAM_LEADER").build()));
                    Role teamMemberRole = roleRepository.findByName("TEAM_MEMBER").orElse(null);

                    if (teamMemberRole != null) {
                        leader.getRoles().remove(teamMemberRole);
                    }
                    leader.getRoles().add(teamLeaderRole);
                    userRepository.save(leader);
                }
            }
        }
    }

    @Transactional
    public void removeTeamMember(String leaderUsername, String memberStudentId) {
        User leader = userRepository.findByUsername(leaderUsername)
                .orElseThrow(() -> new IllegalArgumentException("Leader user not found"));

        List<TeamMembership> leaderMemberships = teamMembershipRepository.findByUserId(leader.getId());
        if (leaderMemberships.isEmpty()) {
            throw new IllegalArgumentException("User is not in any team");
        }

        TeamMembership leaderMembership = leaderMemberships.get(0);
        if (!"LEADER".equals(leaderMembership.getRole())) {
            throw new IllegalArgumentException("Only the team leader can remove members.");
        }

        Team team = leaderMembership.getTeam();

        if ("PENDING".equals(team.getStatus()) || "APPROVED".equals(team.getStatus())) {
            throw new IllegalArgumentException("Cannot remove members while team registration is pending or approved.");
        }

        Student memberStudent = studentRepository.findByMssv(memberStudentId)
                .orElseThrow(() -> new IllegalArgumentException("Student not found"));

        TeamMembership memberMembership = teamMembershipRepository.findByUserIdAndTeamId(memberStudent.getUser().getId(), team.getId())
                .orElseThrow(() -> new IllegalArgumentException("Member is not in this team"));

        if (memberMembership.getUser().getId().equals(leader.getId())) {
            throw new IllegalArgumentException("Leader cannot remove themselves from the team.");
        }

        teamMembershipRepository.delete(memberMembership);
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

    private Student requireStudent(User user) {
        return studentRepository.findByUser(user)
                .orElseThrow(() -> new IllegalArgumentException("Student profile not found"));
    }
}
