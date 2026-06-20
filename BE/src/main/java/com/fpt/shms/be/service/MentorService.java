package com.fpt.shms.be.service;

import com.fpt.shms.be.dto.MentorTrackResponse;
import com.fpt.shms.be.model.*;
import com.fpt.shms.be.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class MentorService {

    private final MentorAssignmentRepository mentorAssignmentRepository;
    private final UserRepository userRepository;
    private final TeamMembershipRepository teamMembershipRepository;
    private final SubmissionRepository submissionRepository;
    private final StudentRepository studentRepository;
    private final TeamMentorRepository teamMentorRepository;

    public MentorTrackResponse getAssignedTeams(String username) {
        User mentor = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("Mentor not found"));

        // Truy vấn Team qua bảng trung gian
        List<TeamMentor> teamMentors = teamMentorRepository.findByMentorId(mentor.getId());

        List<MentorTrackResponse.TrackOverviewDto> trackOverviews = new ArrayList<>();
        List<MentorTrackResponse.AssignedTeamDto> allocatedTeams = new ArrayList<>();

        java.util.Map<Long, Category> assignedCategories = new java.util.HashMap<>();
        java.util.Map<Long, Integer> categoryTeamCount = new java.util.HashMap<>();
        java.util.Map<Long, Integer> categorySubmittedCount = new java.util.HashMap<>();

        String contestName = "N/A";

        for (TeamMentor tmAlloc : teamMentors) {
            Team team = tmAlloc.getTeam();
            if (!"APPROVED".equals(team.getStatus())) continue;

            if ("N/A".equals(contestName) && team.getContest() != null) {
                contestName = team.getContest().getName();
            }

            Category category = tmAlloc.getCategory();
            assignedCategories.putIfAbsent(category.getId(), category);
            categoryTeamCount.put(category.getId(), categoryTeamCount.getOrDefault(category.getId(), 0) + 1);

            List<TeamMembership> memberships = teamMembershipRepository.findByTeamId(team.getId());
            String leaderName = "N/A";
            int membersCount = memberships.size();
            for (TeamMembership tm : memberships) {
                if ("LEADER".equals(tm.getRole())) {
                    Student s = studentRepository.findByUser(tm.getUser()).orElse(null);
                    leaderName = s != null ? s.getFullName() : tm.getUser().getUsername();
                }
            }

            List<Submission> submissions = submissionRepository.findByTeamId(team.getId());
            Submission latestSub = null;
            for (Submission s : submissions) {
                if (latestSub == null || (s.getVersion() != null && latestSub.getVersion() != null && s.getVersion() > latestSub.getVersion())) {
                    latestSub = s;
                }
            }

            String progressStatus = latestSub != null ? "Submitted" : "Ideation";
            if (latestSub != null) {
                categorySubmittedCount.put(category.getId(), categorySubmittedCount.getOrDefault(category.getId(), 0) + 1);
            }

            allocatedTeams.add(MentorTrackResponse.AssignedTeamDto.builder()
                    .teamId(team.getId())
                    .teamName(team.getName())
                    .trackName(category.getName())
                    .leaderName(leaderName)
                    .totalMembers(membersCount)
                    .progressStatus(progressStatus)
                    .githubRepoUrl(latestSub != null ? latestSub.getProjectRepositoryUrl() : null)
                    .liveDemoUrl(latestSub != null ? latestSub.getDemoVideoUrl() : null)
                    .docsUrl(latestSub != null ? latestSub.getDocumentationUrl() : null)
                    .slideUrl(latestSub != null ? latestSub.getPresentationSlideUrl() : null)
                    .build());
        }

        for (Category category : assignedCategories.values()) {
            int totalTeams = categoryTeamCount.getOrDefault(category.getId(), 0);
            int submittedTeams = categorySubmittedCount.getOrDefault(category.getId(), 0);
            int completionPercentage = totalTeams > 0 ? (submittedTeams * 100 / totalTeams) : 0;

            trackOverviews.add(MentorTrackResponse.TrackOverviewDto.builder()
                    .trackId(category.getId())
                    .trackName(category.getName())
                    .assignedTeams(totalTeams)
                    .activeSessions(0)
                    .completionPercentage(completionPercentage)
                    .build());
        }

        return MentorTrackResponse.builder()
                .contestName(contestName)
                .trackOverviews(trackOverviews)
                .allocatedTeams(allocatedTeams)
                .build();
    }
}