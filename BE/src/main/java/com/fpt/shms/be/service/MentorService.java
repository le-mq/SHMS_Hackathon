package com.fpt.shms.be.service;

import com.fpt.shms.be.dto.MentorTrackResponse;
import com.fpt.shms.be.model.*;
import com.fpt.shms.be.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class MentorService {

    private final UserRepository userRepository;
    private final TeamMembershipRepository teamMembershipRepository;
    private final SubmissionRepository submissionRepository;
    private final StudentRepository studentRepository;
    private final TeamMentorRepository teamMentorRepository;

    private final RoundRepository roundRepository;

    public java.util.List<MentorTrackResponse> getAssignedTeams(String username) {
        User mentor = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("Mentor not found"));

        List<TeamMentor> teamMentors = teamMentorRepository.findByMentorId(mentor.getId());

        java.util.Map<Long, List<TeamMentor>> teamMentorsByContest = new java.util.HashMap<>();
        for (TeamMentor tm : teamMentors) {
            if (tm.getTeam().getContest() != null) {
                teamMentorsByContest
                        .computeIfAbsent(tm.getTeam().getContest().getId(), k -> new java.util.ArrayList<>()).add(tm);
            }
        }

        List<MentorTrackResponse> responses = new java.util.ArrayList<>();
        java.time.LocalDateTime now = java.time.LocalDateTime.now();

        for (java.util.Map.Entry<Long, List<TeamMentor>> entry : teamMentorsByContest.entrySet()) {
            List<TeamMentor> contestTMs = entry.getValue();
            com.fpt.shms.be.model.Contest contest = contestTMs.get(0).getTeam().getContest();

            List<MentorTrackResponse.TrackOverviewDto> trackOverviews = new java.util.ArrayList<>();
            List<MentorTrackResponse.AssignedTeamDto> allocatedTeams = new java.util.ArrayList<>();

            java.util.Map<Long, Category> assignedCategories = new java.util.HashMap<>();
            java.util.Map<Long, Integer> categoryTeamCount = new java.util.HashMap<>();
            java.util.Map<Long, Integer> categorySubmittedCount = new java.util.HashMap<>();
            java.util.Map<Long, String> categoryFeedbackDeadline = new java.util.HashMap<>();
            java.util.Map<Long, String> categoryRoundState = new java.util.HashMap<>();

            for (TeamMentor tmAlloc : contestTMs) {
                Team team = tmAlloc.getTeam();
                if (!"APPROVED".equals(team.getStatus()))
                    continue;

                Category category = tmAlloc.getCategory();
                assignedCategories.putIfAbsent(category.getId(), category);
                categoryTeamCount.put(category.getId(), categoryTeamCount.getOrDefault(category.getId(), 0) + 1);

                List<Round> categoryRounds = roundRepository.findByCategoryIdOrderBySubmissionOpenAsc(category.getId());
                Round targetRound = null;
                for (Round r : categoryRounds) {
                    if (r.getState() == Round.RoundState.ACTIVED) {
                        targetRound = r;
                        break;
                    }
                }
                if (targetRound == null) {
                    for (Round r : categoryRounds) {
                        java.time.LocalDateTime roundEnd = r.getPublishResultAt() != null ? r.getPublishResultAt() :
                                (r.getGradingDeadlineAt() != null ? r.getGradingDeadlineAt() :
                                 (r.getGradingOpenAt() != null ? r.getGradingOpenAt() : r.getSubmissionDeadline()));

                        if (roundEnd != null && now.isBefore(roundEnd)) {
                            targetRound = r;
                            break;
                        }
                    }
                }
                if (targetRound == null && !categoryRounds.isEmpty()) {
                    targetRound = categoryRounds.get(categoryRounds.size() - 1);
                }

                if (targetRound != null) {
                    java.time.LocalDateTime deadline = targetRound.getGradingOpenAt() != null ? targetRound.getGradingOpenAt() : targetRound.getSubmissionDeadline();
                    if (deadline != null) {
                        categoryFeedbackDeadline.put(category.getId(), deadline.toString());
                    }
                }
                if (targetRound != null && targetRound.getState() != null) {
                    categoryRoundState.put(category.getId(), targetRound.getState().name());
                }

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
                    if (targetRound != null && s.getRound() != null
                            && !s.getRound().getId().equals(targetRound.getId())) {
                        continue;
                    }
                    if (latestSub == null || (s.getVersion() != null && latestSub.getVersion() != null
                            && s.getVersion() > latestSub.getVersion())) {
                        latestSub = s;
                    }
                }

                String progressStatus = latestSub != null ? "Submitted" : "Ideation";

                if (latestSub != null) {
                    categorySubmittedCount.put(category.getId(),
                            categorySubmittedCount.getOrDefault(category.getId(), 0) + 1);
                }

                boolean canGiveFeedback = false;
                if (latestSub != null && targetRound != null) {
                    if (targetRound.getState() == Round.RoundState.CLOSED) {
                        canGiveFeedback = false;
                    } else {
                        java.time.LocalDateTime gradingOpen = targetRound.getGradingOpenAt() != null
                                ? targetRound.getGradingOpenAt()
                                : targetRound.getSubmissionDeadline();

                        if (gradingOpen != null) {
                            canGiveFeedback = now.isBefore(gradingOpen);
                        } else {
                            canGiveFeedback = true;
                        }
                    }
                }

                boolean hasGivenFeedback = false;
                String mentorFeedbackText = null;

                if (latestSub != null) {
                    if (latestSub.getMentorFeedback() != null && latestSub.getMentor() != null && latestSub.getMentor().getId().equals(mentor.getId())) {
                        hasGivenFeedback = true;
                        mentorFeedbackText = latestSub.getMentorFeedback();
                    }
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
                        .roundId(targetRound != null ? targetRound.getId() : null)
                        .roundName(targetRound != null ? targetRound.getPhaseName() : null)
                        .submissionId(latestSub != null ? latestSub.getId() : null)
                        .canGiveFeedback(canGiveFeedback)
                        .hasGivenFeedback(hasGivenFeedback)
                        .mentorFeedback(mentorFeedbackText)
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
                        .feedbackDeadline(categoryFeedbackDeadline.get(category.getId()))
                        .targetRoundState(categoryRoundState.get(category.getId()))
                        .build());
            }

            responses.add(MentorTrackResponse.builder()
                    .contestId(contest.getId())
                    .contestName(contest.getName())
                    .trackOverviews(trackOverviews)
                    .allocatedTeams(allocatedTeams)
                    .build());
        }

        return responses;
    }

    /**
     * Mentor gửi feedback vào bài DRAFT.
     * Chỉ được comment vào bài DRAFT thuộc đội mình quản lý, trước deadline nộp
     * bài.
     */
    @Transactional
    public java.util.Map<String, Object> submitFeedback(com.fpt.shms.be.dto.MentorFeedbackRequest request,
                                                        String username) {
        User mentor = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("Mentor not found"));

        Submission submission = submissionRepository.findById(request.getSubmissionId())
                .orElseThrow(() -> new IllegalArgumentException("Submission not found"));

        // Validate: mentor quản lý team
        Team team = submission.getTeam();
        List<TeamMentor> mentorTeams = teamMentorRepository.findByMentorId(mentor.getId());
        boolean isAssigned = mentorTeams.stream()
                .anyMatch(tm -> tm.getTeam().getId().equals(team.getId()));
        if (!isAssigned) {
            throw new IllegalArgumentException("You are not assigned to mentor this team.");
        }

        // Validate: thời gian trước khi judge chấm
        Round round = submission.getRound();
        if (round != null) {
            java.time.LocalDateTime gradingOpen = round.getGradingOpenAt() != null ? round.getGradingOpenAt()
                    : round.getSubmissionDeadline();
            if (gradingOpen != null && java.time.LocalDateTime.now().isAfter(gradingOpen)) {
                throw new IllegalArgumentException("Feedback window is closed as official grading has started.");
            }
        }

        submission.setMentorFeedback(request.getFeedbackContent());
        submission.setMentor(mentor);
        submissionRepository.save(submission);

        java.util.Map<String, Object> result = new java.util.HashMap<>();
        result.put("message", "Feedback submitted successfully.");
        result.put("feedbackId", submission.getId());
        return result;
    }
}