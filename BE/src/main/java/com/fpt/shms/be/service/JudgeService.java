package com.fpt.shms.be.service;

import com.fpt.shms.be.dto.EvaluationDataResponse;
import com.fpt.shms.be.dto.EvaluatorDashboardResponse;
import com.fpt.shms.be.dto.SubmitScoreRequest;
import com.fpt.shms.be.model.*;
import com.fpt.shms.be.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import jakarta.persistence.EntityManager;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;
import jakarta.annotation.PostConstruct;

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
    private final RankingResultRepository rankingResultRepository;
    private final AuditLogService auditLogService;
    private final TeamMentorRepository teamMentorRepository;
    private final EntityManager entityManager;

    @PostConstruct
    @Transactional
    public void dropScoreJudgeConstraint() {
        try {
            entityManager.createNativeQuery("ALTER TABLE Score DROP CONSTRAINT fk_score_judge").executeUpdate();
        } catch (Exception e) {
        }
    }

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


        int evaluatedCount = 0;

        java.util.Map<Long, List<Round>> contestRoundsCache = new java.util.HashMap<>();

        List<EvaluatorDashboardResponse.AssignedTeamQueueDto> queue = new ArrayList<>();
        final List<Category> finalCategories = categories;
        for (Team team : assignedTeams) {
            Long teamContestId = team.getContest().getId();
            List<Round> cRounds = contestRoundsCache.computeIfAbsent(teamContestId, roundRepository::findByContestIdOrderBySubmissionOpenAsc)
                    .stream()
                    .filter(r -> r.getCategory() == null || finalCategories.stream().anyMatch(c -> c.getId().equals(r.getCategory().getId())))
                    .toList();

            for (int i = 0; i < cRounds.size(); i++) {
                Round round = cRounds.get(i);

                if (i > 0) {
                    Round previousRound = cRounds.get(i - 1);
                    boolean isQualified = rankingResultRepository.existsByTeamIdAndRoundIdAndQualificationStatus(
                            team.getId(), previousRound.getId(), "QUALIFIED");
                    if (!isQualified) {
                        continue;
                    }
                }

                Submission latestSub = submissions.stream()
                        .filter(s -> s.getTeam().getId().equals(team.getId()) && s.getRound() != null && s.getRound().getId().equals(round.getId()))
                        .max((s1, s2) -> s1.getVersion().compareTo(s2.getVersion()))
                        .orElse(null);

                boolean isEvaluated = false;
                Integer totalScore = null;
                if (latestSub != null) {
                    List<Score> scores = scoreRepository.findByJudgeIdAndSubmissionId(user.getId(), latestSub.getId());
                    if (scores != null && !scores.isEmpty()) {
                        isEvaluated = true;
                        totalScore = scores.stream().mapToInt(sc -> sc.getPointsAwarded() != null ? sc.getPointsAwarded().intValue() : 0).sum();
                    }
                }
                if (isEvaluated) {
                    evaluatedCount++;
                }

                boolean missedDeadline = false;
                if (latestSub == null) {
                    if (round.getSubmissionDeadline() != null && java.time.LocalDateTime.now().isAfter(round.getSubmissionDeadline())) {
                        missedDeadline = true;
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

                String abbreviation = team.getName() != null && team.getName().length() >= 2
                        ? team.getName().substring(0, 2).toUpperCase()
                        : "TM";

                String trackName = round.getCategory() != null 
                        ? round.getCategory().getName() 
                        : categories.stream()
                                .filter(c -> c.getContest() != null && c.getContest().getId().equals(team.getContest().getId()))
                                .map(Category::getName)
                                .collect(Collectors.joining(", "));

                queue.add(EvaluatorDashboardResponse.AssignedTeamQueueDto.builder()
                        .teamId(team.getId())
                        .submissionId(latestSub != null ? latestSub.getId() : null)
                        .roundId(round.getId())
                        .teamName(team.getName())
                        .abbreviation(abbreviation)
                        .trackName(trackName.isEmpty() ? "Unknown Track" : trackName)
                        .roundName(round.getPhaseName())
                        .submissionState(submissionState)
                        .themeClass("ai")
                        .gradingDeadlineAt(round.getGradingDeadlineAt())
                        .roundFormat(round.getRoundFormat() != null ? round.getRoundFormat() : "Not Specified")
                        .score(totalScore)
                        .build());
            }
        }

        List<EvaluatorDashboardResponse.RoundDto> roundDtos = new ArrayList<>();
        List<Long> contestIdsForRounds = finalCategories.stream().map(c -> c.getContest().getId()).distinct().toList();
        for (Long cId : contestIdsForRounds) {
            List<Round> cRounds = roundRepository.findByContestIdOrderBySubmissionOpenAsc(cId);
            for (Round r : cRounds) {
                if (r.getCategory() == null || finalCategories.stream().anyMatch(c -> c.getId().equals(r.getCategory().getId()))) {
                    roundDtos.add(EvaluatorDashboardResponse.RoundDto.builder()
                            .id(r.getId())
                            .name(r.getPhaseName())
                            .format(r.getRoundFormat())
                            .gradingDeadlineAt(r.getSubmissionDeadline())
                            .build());
                }
            }
        }
        roundDtos = roundDtos.stream().distinct().toList();

        return EvaluatorDashboardResponse.builder()
                .assignedTrackCount(categories.size())
                .totalAllocatedTeams(queue.size())
                .evaluatedCount(evaluatedCount)
                .contests(contestDtos)
                .queue(queue)
                .rounds(roundDtos)
                .build();
    }

    @Transactional(readOnly = true)
    public EvaluationDataResponse getEvaluationData(String username, Long teamId, Long roundId) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        if (teamId == 0L) {
            Round round = roundRepository.findById(roundId)
                    .orElseThrow(() -> new IllegalArgumentException("Round not found"));
            List<EvaluationDataResponse.CriteriaDto> criteriaDtos = new ArrayList<>();
            ContestRubric rubric = null;

            if (round.getCategory() != null) {
                List<ContestRubric> rubrics = contestRubricRepository.findByCategoryId(round.getCategory().getId());
                rubric = rubrics.isEmpty() ? null : rubrics.get(0);
            } else {
                List<JudgeAssignment> assignments = judgeAssignmentRepository.findByUserId(user.getId());
                Category fallbackCategory = assignments.stream()
                        .map(JudgeAssignment::getCategory)
                        .filter(c -> c.getContest() != null && c.getContest().getId().equals(round.getContest().getId()))
                        .findFirst()
                        .orElse(null);
                if (fallbackCategory != null) {
                    rubric = contestRubricRepository.findFirstByCategoryId(fallbackCategory.getId()).orElse(null);
                } else {
                    List<TeamMentor> mentorAssignments = teamMentorRepository.findByMentorId(user.getId());
                    Category fallbackMentorCat = mentorAssignments.stream()
                            .map(TeamMentor::getCategory)
                            .filter(c -> c.getContest() != null && c.getContest().getId().equals(round.getContest().getId()))
                            .findFirst()
                            .orElse(null);
                    if (fallbackMentorCat != null) {
                        rubric = contestRubricRepository.findFirstByCategoryId(fallbackMentorCat.getId()).orElse(null);
                    }
                }
            }

            if (rubric != null) {
                List<ContestRubricDetails> details = contestRubricDetailsRepository.findByContestRubricId(rubric.getId());
                criteriaDtos = details.stream().map(d -> EvaluationDataResponse.CriteriaDto.builder()
                        .id(d.getId())
                        .name(d.getCriteriaName())
                        .description(d.getDescription())
                        .weight((int) Math.round(d.getPercentageWeight()))
                        .build()).collect(Collectors.toList());
            }

            Contest contest = round.getContest();
            
            return EvaluationDataResponse.builder()
                    .submissionId(null)
                    .teamName("Rubric Preview")
                    .status("PREVIEW")
                    .submissionRequirements(round.getSubmissionRequirements())
                    .contestName(contest != null ? contest.getName() : null)
                    .contestTheme(contest != null ? contest.getDescription() : null)
                    .contestLocation(contest != null ? contest.getLocation() : null)
                    .contestRules(contest != null ? contest.getComplianceRules() : null)
                    .criteria(criteriaDtos)
                    .build();
        }

        Team team = teamRepository.findById(teamId)
                .orElseThrow(() -> new IllegalArgumentException("Team not found"));

        List<JudgeAssignment> assignments = judgeAssignmentRepository.findByUserId(user.getId());

        boolean hasAccess = assignments.stream().anyMatch(a -> a.getCategory().getContest() != null &&
                a.getCategory().getContest().getId().equals(team.getContest().getId()));
        if (!hasAccess) {
            throw new IllegalArgumentException("You are not assigned to evaluate this team");
        }

        List<Submission> teamSubmissions = submissionRepository.findByTeamId(team.getId());

        Submission latestSubmission = null;
        if (!teamSubmissions.isEmpty()) {
            if (roundId != null) {
                latestSubmission = teamSubmissions.stream()
                        .filter(s -> s.getRound() != null && s.getRound().getId().equals(roundId))
                        .max((s1, s2) -> s1.getVersion().compareTo(s2.getVersion()))
                        .orElse(null);
            } else {
                latestSubmission = teamSubmissions.stream()
                        .max((s1, s2) -> s1.getVersion().compareTo(s2.getVersion()))
                        .orElse(null);
            }
        }

        if (latestSubmission == null) {
            Round currentRound = null;
            if (roundId != null) {
                currentRound = roundRepository.findById(roundId).orElse(null);
            }
            if (currentRound == null) {
                currentRound = roundRepository.findByContestIdOrderBySubmissionOpenAsc(team.getContest().getId()).stream().findFirst().orElse(null);
            }
            if (currentRound == null) {
                throw new IllegalArgumentException("Cannot create a dummy submission without a valid round");
            }

            latestSubmission = Submission.builder()
                    .team(team)
                    .round(currentRound)
                    .status("MISSED_DEADLINE")
                    .version(1)
                    .submittedAt(java.time.LocalDateTime.now())
                    .build();
            latestSubmission = submissionRepository.save(latestSubmission);

            auditLogService.log("JUDGE_FORCE_EVALUATE", "Submission", latestSubmission.getTeam() != null ? latestSubmission.getTeam().getName() : "Submission", null, "CREATED", "Judge opened evaluation for non-submitted team");
        }

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
        
        return EvaluationDataResponse.builder()
                .submissionId(latestSubmission.getId())
                .submissionData(latestSubmission.getSubmissionData())
                .projectId("#" + team.getTeamCode())
                .teamName(team.getName())
                .status(latestSubmission.getStatus())
                .submissionRequirements(latestSubmission.getRound() != null ? latestSubmission.getRound().getSubmissionRequirements() : null)
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
            if (round.getGradingDeadlineAt() != null && now.isAfter(round.getGradingDeadlineAt())) {
                throw new IllegalArgumentException("The grading deadline has passed. The system is now closed!");
            }
        }

        Score score = Score.builder()
                .submission(submission)
                .judge(judge.getUser())
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
        auditLogService.log("SUBMIT_SCORE", "Submission", submission.getTeam() != null ? submission.getTeam().getName() : "Submission", null, "FINALIZED", "Total Score: " + total);
    }

    @Transactional
    public void editSubmittedScore(Long scoreId, Double newTotalScore, String reason) {
        Score score = scoreRepository.findById(scoreId)
                .orElseThrow(() -> new IllegalArgumentException("Score record not found"));
        Double oldTotal = score.getTotalScore();
        score.setTotalScore(newTotalScore);
        scoreRepository.save(score);
        String targetName = score.getSubmission() != null && score.getSubmission().getTeam() != null ? score.getSubmission().getTeam().getName() : "Score";
        auditLogService.logEditSubmittedScore(targetName, String.valueOf(oldTotal), String.valueOf(newTotalScore), reason != null ? reason : "Edited by judge/admin");
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
                            .weight(d.getContestRubricDetail() != null ? d.getContestRubricDetail().getPercentageWeight() : null)
                            .feedback(d.getFeedback())
                            .build())
                    .toList();

            String roundStatus = "UNKNOWN";
            String contestName = "Unknown Contest";
            Long contestId = null;
            if (submission.getRound() != null) {
                if (submission.getRound().getPhaseName() != null) {
                    roundStatus = submission.getRound().getPhaseName();
                }
                if (submission.getRound().getContest() != null) {
                    contestName = submission.getRound().getContest().getName();
                    contestId = submission.getRound().getContest().getId();
                }
            }

            records.add(com.fpt.shms.be.dto.JudgeHistoricalLogResponse.Record.builder()
                    .teamName(team != null ? team.getName() : "Unknown Team")
                    .teamId(team != null ? "TEAM-" + team.getId() : "TEAM-0")
                    .timestamp(timestampStr)
                    .roundStatus(roundStatus)
                    .contestName(contestName)
                    .contestId(contestId)
                    .totalScore(totalScore)
                    .details(detailDtos)
                    .build());
        }

        return com.fpt.shms.be.dto.JudgeHistoricalLogResponse.builder()
                .records(records)
                .build();
    }
    private ContestRubricDetails resolveContestRubricDetail(Submission submission, RubricTemplateCriteria criteria) {

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
