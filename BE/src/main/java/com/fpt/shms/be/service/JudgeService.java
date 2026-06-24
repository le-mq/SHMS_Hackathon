package com.fpt.shms.be.service;

import com.fpt.shms.be.dto.EvaluationDataResponse;
import com.fpt.shms.be.dto.EvaluatorDashboardResponse;
import com.fpt.shms.be.dto.SubmitScoreRequest;
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
    private final RubricTemplateCriteriaRepository rubricTemplateCriteriaRepository;
    private final JudgeRepository judgeRepository;
    private final RoundRepository roundRepository;

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

        Map<Long, Submission> latestSubmissions = submissions.stream()
                .collect(Collectors.toMap(
                        sub -> sub.getTeam().getId(),
                        sub -> sub,
                        (s1, s2) -> s1.getVersion() > s2.getVersion() ? s1 : s2
                ));

        int evaluatedCount = 0;

        java.util.Map<Long, List<Round>> contestRoundsCache = new java.util.HashMap<>();

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

            boolean missedDeadline = false;
            if (latestSub == null) {
                Long teamContestId = team.getContest().getId();
                List<Round> cRounds = contestRoundsCache.computeIfAbsent(teamContestId, roundRepository::findByContestIdOrderBySubmissionOpenAsc);
                if (!cRounds.isEmpty() && cRounds.get(0).getSubmissionDeadline() != null) {
                    if (java.time.LocalDateTime.now().isAfter(cRounds.get(0).getSubmissionDeadline())) {
                        missedDeadline = true;
                    }
                }
            }

            String submissionState;
            if (isEvaluated) {
                submissionState = "Evaluated";
            } else if (latestSub != null) {
                submissionState = latestSub.getStatus();
            } else {
                submissionState = missedDeadline ? "Not Submitted" : "Pending";
            }

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

        if (latestSubmission.getRound() != null && latestSubmission.getRound().getCategory() != null) {
            List<ContestRubric> rubrics = contestRubricRepository.findByCategoryId(latestSubmission.getRound().getCategory().getId());
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
                    .weight((int) Math.round(d.getPercentageWeight()))
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

    @Transactional
    public void submitScore(String username, SubmitScoreRequest request) {
        com.fpt.shms.be.model.User judgeUser = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("Judge not found"));
        Judge judge = judgeRepository.findById(judgeUser.getId())
                .orElseThrow(() -> new IllegalArgumentException("Judge profile not found"));
        Submission submission = submissionRepository.findById(request.getSubmissionId())
                .orElseThrow(() -> new IllegalArgumentException("Submission not found"));

        if (scoreRepository.existsByJudgeIdAndSubmissionId(judge.getId(), submission.getId())) {
            throw new IllegalArgumentException("You have already evaluated this submission");
        }

        Round round = submission.getRound();
        if (round != null) {
            java.time.LocalDateTime now = java.time.LocalDateTime.now();

            if (round.getGradingOpenAt() != null && now.isBefore(round.getGradingOpenAt())) {
                throw new IllegalArgumentException("It is not yet time to grade. Please return later!");
            }

            if (round.getGradingDeadlineAt() != null && now.isAfter(round.getGradingDeadlineAt())) {
                throw new IllegalArgumentException("The grading deadline has passed. The system is now closed!");
            }
        }

        Score score = Score.builder()
                .submission(submission)
                .judge(judge)
                .status("FINALIZED")
                .details(new ArrayList<>())
                .build();

        double total = 0.0;
        List<String> feedback = new ArrayList<>();
        for (SubmitScoreRequest.ScoreEntry entry : request.getScores()) {
            ContestRubricDetails rubricDetail = contestRubricDetailsRepository.findById(entry.getCriteriaId()).orElse(null);
            if (rubricDetail == null) {
                RubricTemplateCriteria criteria = rubricTemplateCriteriaRepository.findById(entry.getCriteriaId())
                        .orElseThrow(() -> new IllegalArgumentException("Criteria not found"));
                rubricDetail = resolveContestRubricDetail(submission, criteria);
            }

            double weight = rubricDetail.getPercentageWeight() != null ? rubricDetail.getPercentageWeight() : 0.0;
            double weighted = entry.getPointsAwarded() * weight / 100.0;
            total += weighted;

            if (entry.getFeedback() != null && !entry.getFeedback().isBlank()) {
                feedback.add(rubricDetail.getCriteriaName() + ": " + entry.getFeedback());
            }

            score.getDetails().add(ScoreDetail.builder()
                    .score(score)
                    .contestRubricDetail(rubricDetail)
                    .rawScore(entry.getPointsAwarded())
                    .weightedScore(weighted)
                    .feedback(entry.getFeedback())
                    .build());
        }
        score.setTotalScore(total);
        score.setGeneralFeedback(String.join("\n", feedback));
        scoreRepository.save(score);
    }

    @Transactional(readOnly = true)
    public com.fpt.shms.be.dto.JudgeHistoricalLogResponse getHistoricalLog(String username) {
        User judge = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("Judge not found"));

        List<Score> allScores = scoreRepository.findByJudgeId(judge.getId());

        java.util.Map<Submission, List<Score>> scoresBySubmission = allScores.stream()
                .collect(java.util.stream.Collectors.groupingBy(Score::getSubmission));

        List<com.fpt.shms.be.dto.JudgeHistoricalLogResponse.Record> records = new java.util.ArrayList<>();
        java.time.format.DateTimeFormatter formatter = java.time.format.DateTimeFormatter.ofPattern("MMM dd, yyyy\nHH:mm a");

        for (java.util.Map.Entry<Submission, List<Score>> entry : scoresBySubmission.entrySet()) {
            Submission submission = entry.getKey();
            List<Score> scores = entry.getValue();

            double totalScore = scores.stream().mapToDouble(Score::getPointsAwarded).sum();
            Team team = submission.getTeam();

            String timestampStr = submission.getSubmittedAt() != null
                    ? submission.getSubmittedAt().format(formatter)
                    : java.time.LocalDateTime.now().format(formatter);

            List<com.fpt.shms.be.dto.JudgeHistoricalLogResponse.ScoreDetail> detailDtos = scores.stream()
                    .flatMap(s -> s.getDetails().stream())
                    .map(d -> com.fpt.shms.be.dto.JudgeHistoricalLogResponse.ScoreDetail.builder()
                            .criteriaName(d.getContestRubricDetail() != null ? d.getContestRubricDetail().getCriteriaName() : "Unknown")
                            .pointsAwarded(d.getRawScore())
                            .feedback(d.getFeedback())
                            .build())
                    .toList();

            records.add(com.fpt.shms.be.dto.JudgeHistoricalLogResponse.Record.builder()
                    .teamName(team != null ? team.getName() : "Unknown Team")
                    .teamId(team != null ? "TEAM-" + team.getId() : "TEAM-0")
                    .timestamp(timestampStr)
                    .roundStatus("LOCKED")
                    .totalScore(totalScore)
                    .details(detailDtos)
                    .build());
        }

        return com.fpt.shms.be.dto.JudgeHistoricalLogResponse.builder()
                .records(records)
                .build();
    }

    private ContestRubricDetails resolveContestRubricDetail(Submission submission, RubricTemplateCriteria criteria) {
        Team team = submission.getTeam();
        Category category = submission.getRound() != null ? submission.getRound().getCategory() : null;
        ContestRubric rubric = null;

        if (category != null) {
            rubric = contestRubricRepository.findFirstByCategoryId(category.getId()).orElse(null);
        }

        if (rubric == null && category != null) {
            rubric = contestRubricRepository.save(ContestRubric.builder()
                    .category(category)
                    .rubricTemplate(criteria.getRubricTemplate())
                    .rubricName(criteria.getRubricTemplate() != null ? criteria.getRubricTemplate().getName() : "Rubric")
                    .totalWeight(100.0)
                    .status("ACTIVE")
                    .build());
        }

        if (rubric == null) {
            throw new IllegalArgumentException("Contest rubric not found");
        }

        final ContestRubric finalRubric = rubric;
        return contestRubricDetailsRepository.findByContestRubricId(finalRubric.getId()).stream()
                .filter(d -> d.getCriteriaName().equalsIgnoreCase(criteria.getCriteriaName()))
                .findFirst()
                .orElseGet(() -> contestRubricDetailsRepository.save(ContestRubricDetails.builder()
                        .contestRubric(finalRubric)
                        .criteriaName(criteria.getCriteriaName())
                        .description(criteria.getDescription())
                        .maxScore(criteria.getMaxScore())
                        .percentageWeight(criteria.getPercentageWeight())
                        .build()));
    }
}