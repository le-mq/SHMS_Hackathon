package com.fpt.shms.be.service;

import com.fpt.shms.be.dto.EvaluationDataResponse;
import com.fpt.shms.be.dto.EvaluatorDashboardResponse;
import com.fpt.shms.be.model.*;
import com.fpt.shms.be.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class JudgeService {

    private final UserRepository userRepository;
    private final JudgeAssignmentRepository judgeAssignmentRepository;
    private final TeamRepository teamRepository;
    private final SubmissionRepository submissionRepository;
    private final ScoreRepository scoreRepository;
    private final ContestRubricRepository contestRubricRepository;
    private final ContestRubricDetailsRepository contestRubricDetailsRepository;

    @Transactional(readOnly = true)
    public EvaluatorDashboardResponse getDashboardData(String username, Long contestId) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        List<JudgeAssignment> assignments = judgeAssignmentRepository.findByUserId(user.getId());
        List<Category> allCategories = assignments.stream().map(JudgeAssignment::getCategory).toList();

        List<Contest> allContests = allCategories.stream()
                .map(Category::getContest)
                .filter(c -> c != null)
                .distinct()
                .toList();

        List<EvaluatorDashboardResponse.ContestDto> contestDtos = allContests.stream()
                .map(c -> EvaluatorDashboardResponse.ContestDto.builder().id(c.getId()).name(c.getName()).build())
                .toList();

        List<Category> categories = allCategories;
        if (contestId != null) {
            categories = categories.stream()
                    .filter(c -> c.getContest() != null && c.getContest().getId().equals(contestId))
                    .toList();
        }

        List<Long> assignedContestIds = categories.stream().map(c -> c.getContest().getId()).distinct().toList();

        List<Team> assignedTeams = new ArrayList<>();
        for (Long cId : assignedContestIds) {
            assignedTeams.addAll(teamRepository.findByContestId(cId));
        }

        List<Long> teamIds = assignedTeams.stream().map(Team::getId).toList();
        List<Submission> submissions = teamIds.isEmpty() ? new ArrayList<>() : submissionRepository.findByTeamIdIn(teamIds);

        // Keep latest submission for each team
        Map<Long, Submission> latestSubmissions = submissions.stream()
                .collect(Collectors.toMap(
                        sub -> sub.getTeam().getId(),
                        sub -> sub,
                        (s1, s2) -> s1.getVersion() > s2.getVersion() ? s1 : s2
                ));

        int evaluatedCount = 0;

        List<EvaluatorDashboardResponse.AssignedTeamQueueDto> queue = new ArrayList<>();
        for (Team team : assignedTeams) {
            Submission latestSub = latestSubmissions.get(team.getId());
            boolean isEvaluated = false;
            if (latestSub != null) {
                isEvaluated = scoreRepository.existsByJudgeIdAndSubmissionId(user.getId(), latestSub.getId());
            }
            if (isEvaluated) {
                evaluatedCount++;
            }

            String submissionState = isEvaluated ? "Evaluated" : (latestSub != null ? latestSub.getStatus() : "Pending");
            String roundName = latestSub != null && latestSub.getRound() != null ? latestSub.getRound().getPhaseName() : "Latest Round";

            String abbreviation = team.getName() != null && team.getName().length() >= 2
                    ? team.getName().substring(0, 2).toUpperCase()
                    : "TM";

            String trackName = categories.stream()
                    .filter(c -> c.getContest() != null && c.getContest().getId().equals(team.getContest().getId()))
                    .map(Category::getName)
                    .collect(Collectors.joining(", "));

            queue.add(EvaluatorDashboardResponse.AssignedTeamQueueDto.builder()
                    .teamId(team.getId())
                    .teamName(team.getName())
                    .abbreviation(abbreviation)
                    .trackName(trackName.isEmpty() ? "Unknown Track" : trackName)
                    .roundName(roundName)
                    .submissionState(submissionState)
                    .themeClass("ai")
                    .build());
        }

        return EvaluatorDashboardResponse.builder()
                .assignedTrackCount(categories.size())
                .totalAllocatedTeams(assignedTeams.size())
                .evaluatedCount(evaluatedCount)
                .contests(contestDtos)
                .queue(queue)
                .build();
    }

    @Transactional(readOnly = true)
    public EvaluationDataResponse getEvaluationData(String username, Long teamId) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        Team team = teamRepository.findById(teamId)
                .orElseThrow(() -> new IllegalArgumentException("Team not found"));

        List<JudgeAssignment> assignments = judgeAssignmentRepository.findByUserId(user.getId());

        boolean hasAccess = assignments.stream().anyMatch(a -> a.getCategory().getContest() != null &&
                a.getCategory().getContest().getId().equals(team.getContest().getId()));
        if (!hasAccess) {
            throw new IllegalArgumentException("You are not assigned to evaluate this team");
        }

        List<Submission> teamSubmissions = submissionRepository.findByTeamId(team.getId());
        if (teamSubmissions.isEmpty()) {
            throw new IllegalArgumentException("Team has no submissions");
        }

        Submission latestSubmission = teamSubmissions.stream()
                .max((s1, s2) -> s1.getVersion().compareTo(s2.getVersion()))
                .orElseThrow();

        List<EvaluationDataResponse.CriteriaDto> criteriaDtos = new ArrayList<>();
        ContestRubric rubric = null;

        if (latestSubmission.getRound() != null) {
            List<ContestRubric> rubrics = contestRubricRepository.findByRoundId(latestSubmission.getRound().getId());
            rubric = rubrics.isEmpty() ? null : rubrics.get(0);
        }

        if (rubric == null) {

            Category fallbackCategory = assignments.stream()
                    .map(JudgeAssignment::getCategory)
                    .filter(c -> c.getContest() != null && c.getContest().getId().equals(team.getContest().getId()))
                    .findFirst()
                    .orElse(null);

            if (fallbackCategory != null) {
                rubric = contestRubricRepository.findFirstByCategoryId(fallbackCategory.getId()).orElse(null);
            }
        }

        if (rubric != null) {
            List<ContestRubricDetails> details = contestRubricDetailsRepository.findByContestRubricId(rubric.getId());
            criteriaDtos = details.stream().map(d -> EvaluationDataResponse.CriteriaDto.builder()
                    .id(d.getId())
                    .name(d.getCriteriaName())
                    .description(d.getDescription())
                    .weight((int) Math.round(d.getPercentageWeight())) // percentage_weight in db or max_score, assumed getPercentageWeight exists based on context or we should use getMaxScore? Wait, original code had d.getPercentageWeight() so it's correct.
                    .build()).toList();
        }

        if (criteriaDtos.isEmpty()) {
            criteriaDtos = List.of(
                    EvaluationDataResponse.CriteriaDto.builder().id(1L).name("Technical Complexity").description("Architecture, code quality, and technical difficulty.").weight(30).build(),
                    EvaluationDataResponse.CriteriaDto.builder().id(2L).name("Innovation").description("Originality of the idea and creative problem-solving.").weight(20).build(),
                    EvaluationDataResponse.CriteriaDto.builder().id(3L).name("UI/UX Design").description("Visual aesthetic, accessibility, and user journey flow.").weight(25).build(),
                    EvaluationDataResponse.CriteriaDto.builder().id(4L).name("Pitch Quality").description("Clarity of presentation and ability to communicate value.").weight(25).build()
            );
        }

        return EvaluationDataResponse.builder()
                .submissionId(latestSubmission.getId())
                .githubRepoUrl(latestSubmission.getProjectRepositoryUrl())
                .liveDemoUrl(latestSubmission.getDemoVideoUrl())
                .docsUrl(latestSubmission.getDocumentationUrl())
                .slideUrl(latestSubmission.getPresentationSlideUrl())
                .projectId("#" + team.getInvitationCode())
                .teamName(team.getName())
                .criteria(criteriaDtos)
                .build();
    }
}