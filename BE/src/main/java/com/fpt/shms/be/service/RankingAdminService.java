package com.fpt.shms.be.service;

import com.fpt.shms.be.dto.ProcessRankingsResponse;
import com.fpt.shms.be.dto.RankingReadinessResponse;
import com.fpt.shms.be.model.*;
import com.fpt.shms.be.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class RankingAdminService {

    private final ContestRepository contestRepository;
    private final RoundRepository roundRepository;
    private final SubmissionRepository submissionRepository;
    private final ScoreRepository scoreRepository;
    private final JudgeAssignmentRepository judgeAssignmentRepository;
    private final RankingResultRepository rankingResultRepository;
    private final ContestRubricRepository contestRubricRepository;
    private final AuditLogService auditLogService;
    private final TeamRepository teamRepository;

    private List<Team> getParticipatingTeams(Round round) {
        if (round.getCategory() == null) {
            return new ArrayList<>();
        }
        Long categoryId = round.getCategory().getId();

        List<Round> categoryRounds = roundRepository.findByContestIdOrderBySubmissionOpenAsc(round.getContest().getId())
                .stream()
                .filter(r -> r.getCategory() != null && r.getCategory().getId().equals(categoryId))
                .sorted(Comparator.comparing(Round::getSubmissionOpen))
                .toList();

        int idx = -1;
        for (int i = 0; i < categoryRounds.size(); i++) {
            if (categoryRounds.get(i).getId().equals(round.getId())) {
                idx = i;
                break;
            }
        }

        if (idx <= 0) {
            return teamRepository.findByContestId(round.getContest().getId()).stream()
                    .filter(t -> t != null && "APPROVED".equals(t.getStatus()))
                    .toList();
        } else {
            Round previousRound = categoryRounds.get(idx - 1);
            return rankingResultRepository.findQualifiedByRoundId(previousRound.getId()).stream()
                    .filter(rr -> rr.getDatePublishedAt() != null)
                    .map(RankingResult::getTeam)
                    .filter(t -> t != null && "APPROVED".equals(t.getStatus()))
                    .toList();
        }
    }

    public RankingReadinessResponse getReadiness(Long contestId, Long roundId) {
        Round round = roundRepository.findById(roundId)
                .orElseThrow(() -> new IllegalArgumentException("Round not found"));

        List<ContestRubric> rubricsForRound = new ArrayList<>();
        if (round.getCategory() != null) {
            rubricsForRound = contestRubricRepository.findByCategoryId(round.getCategory().getId());
        }
        List<Long> roundCategoryIds = rubricsForRound.stream().map(cr -> cr.getCategory().getId()).distinct().toList();

        List<Submission> allSubmissionsRaw = submissionRepository.findAll().stream()
                .filter(s -> s.getTeam() != null && s.getTeam().getContest() != null &&
                        s.getTeam().getContest().getId().equals(contestId) &&
                        "APPROVED".equals(s.getTeam().getStatus()) &&
                        s.getRound().getId().equals(round.getId()) &&
                        !"DRAFT".equalsIgnoreCase(s.getStatus()))
                .toList();

        Map<Long, Submission> latestSubmissions = new HashMap<>();
        for (Submission s : allSubmissionsRaw) {
            Submission existing = latestSubmissions.get(s.getTeam().getId());
            if (existing == null) {
                latestSubmissions.put(s.getTeam().getId(), s);
            } else if (s.getVersion() != null && existing.getVersion() != null) {
                if (s.getVersion() > existing.getVersion()) {
                    latestSubmissions.put(s.getTeam().getId(), s);
                } else if (s.getVersion().equals(existing.getVersion()) && s.getId() > existing.getId()) {
                    latestSubmissions.put(s.getTeam().getId(), s);
                }
            }
        }
        List<Submission> allSubmissions = new ArrayList<>(latestSubmissions.values());

        List<JudgeAssignment> assignments = judgeAssignmentRepository.findAll().stream()
                .filter(ja -> roundCategoryIds.contains(ja.getCategory().getId()))
                .toList();

        Set<User> judges = assignments.stream().map(JudgeAssignment::getUser).collect(Collectors.toSet());

        List<Team> participatingTeams = getParticipatingTeams(round);
        Set<Long> participatingTeamIds = participatingTeams.stream().map(Team::getId).collect(Collectors.toSet());

        long officialSubCount = allSubmissions.stream()
                .filter(s -> s.getStatus() != null &&
                        ("OFFICIAL".equalsIgnoreCase(s.getStatus()) ||
                                "SUBMITTED".equalsIgnoreCase(s.getStatus()) ||
                                "EVALUATED".equalsIgnoreCase(s.getStatus()) ||
                                "GRADED".equalsIgnoreCase(s.getStatus()))
                        &&
                        s.getTeam() != null && participatingTeamIds.contains(s.getTeam().getId()))
                .count();

        boolean allTeamsSubmitted = (officialSubCount == participatingTeams.size() && !participatingTeams.isEmpty());
        boolean deadlinePassed = round.getSubmissionDeadline() != null
                && LocalDateTime.now().isAfter(round.getSubmissionDeadline());
        boolean submissionPhaseDone = deadlinePassed || allTeamsSubmitted;

        List<RankingReadinessResponse.Evaluator> evaluatorList = new ArrayList<>();
        boolean allReady = submissionPhaseDone;

        for (User judge : judges) {
            boolean judgeReady = submissionPhaseDone;
            if (judgeReady) {
                for (Submission s : allSubmissions) {
                    if (s.getStatus() != null && "DRAFT".equalsIgnoreCase(s.getStatus())) {
                        continue;
                    }
                    if ("MISSED_DEADLINE".equalsIgnoreCase(s.getStatus())
                            && !scoreRepository.existsBySubmissionId(s.getId())) {
                        continue;
                    }
                    if (!scoreRepository.existsByJudgeIdAndSubmissionId(judge.getId(), s.getId())) {
                        judgeReady = false;
                        break;
                    }
                }
            }

            if (!judgeReady) {
                allReady = false;
            }

            String date = "";
            if (judgeReady) {
                if (round.getState() == Round.RoundState.CLOSED && round.getGradingDeadlineAt() != null) {
                    date = round.getGradingDeadlineAt().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm"));
                } else {
                    date = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm"));
                }
            }
            evaluatorList.add(RankingReadinessResponse.Evaluator.builder()
                    .name(judge.getUsername())
                    .dept("Hackathon Judge")
                    .status(judgeReady ? "Finalized" : "Pending")
                    .date(date)
                    .build());
        }

        Map<Team, Double> teamScores = new HashMap<>();
        for (Team team : participatingTeams) {
            teamScores.put(team, 0.0);
        }
        for (Submission s : allSubmissions) {
            if (teamScores.containsKey(s.getTeam())) {
                List<Score> scores = scoreRepository.findBySubmissionId(s.getId());

                double totalScore = scores.stream()
                        .mapToDouble(sc -> sc.getTotalScore() != null ? sc.getTotalScore() : 0.0).sum();
                long judgeCount = scores.stream().filter(sc -> sc.getJudge() != null).map(sc -> sc.getJudge().getId())
                        .distinct().count();
                double avgScore = judgeCount > 0 ? totalScore / judgeCount : (scores.isEmpty() ? 0.0 : totalScore);

                teamScores.put(s.getTeam(), avgScore);
            }
        }

        double totalAvg = teamScores.values().stream().mapToDouble(Double::doubleValue).average().orElse(0.0);
        double minScore = teamScores.values().stream().mapToDouble(Double::doubleValue).min().orElse(0.0);
        double maxScore = teamScores.values().stream().mapToDouble(Double::doubleValue).max().orElse(0.0);

        int[] bins = new int[10];
        for (Double score : teamScores.values()) {
            int binIndex = (int) (score / 10.0);
            if (binIndex >= 10)
                binIndex = 9;
            bins[binIndex]++;
        }
        List<Integer> bars = java.util.Arrays.stream(bins).boxed().toList();

        RankingReadinessResponse.Summary summary = RankingReadinessResponse.Summary.builder()
                .totalTeams(teamScores.size())
                .avgScore(Math.round(totalAvg * 100.0) / 100.0)
                .scoreRange(Math.round(minScore) + "-" + Math.round(maxScore))
                .bars(bars)
                .build();

        return RankingReadinessResponse.builder()
                .summary(summary)
                .evaluators(evaluatorList)
                .allReady(allReady || evaluatorList.isEmpty())
                .build();
    }

    @Transactional
    public ProcessRankingsResponse processRankings(Long contestId, Long roundId, int topN) {
        Round round = roundRepository.findById(roundId)
                .orElseThrow(() -> new IllegalArgumentException("Round not found"));

        if (round.getPublishResultAt() != null && !round.getPublishResultAt().isAfter(LocalDateTime.now())) {
            throw new IllegalArgumentException(
                    "Results have already been published for this round. No further modifications are allowed.");
        }

        Contest contest = contestRepository.findById(contestId)
                .orElseThrow(() -> new IllegalArgumentException("Contest not found"));
        String contestName = contest.getName();
        String roundName = round.getPhaseName();

        if (round.getCategory() == null) {
            throw new IllegalArgumentException("Round is not associated with any category");
        }
        String actualCategoryName = round.getCategory().getName();

        List<Submission> allSubmissionsRaw = submissionRepository.findAll().stream()
                .filter(s -> s.getTeam() != null && s.getTeam().getContest() != null &&
                        s.getTeam().getContest().getId().equals(contestId) &&
                        "APPROVED".equals(s.getTeam().getStatus()) &&
                        s.getRound().getId().equals(round.getId()) &&
                        !"DRAFT".equalsIgnoreCase(s.getStatus()))
                .toList();

        Map<Long, Submission> latestSubmissions = new HashMap<>();
        for (Submission s : allSubmissionsRaw) {
            Submission existing = latestSubmissions.get(s.getTeam().getId());
            if (existing == null) {
                latestSubmissions.put(s.getTeam().getId(), s);
            } else if (s.getVersion() != null && existing.getVersion() != null) {
                if (s.getVersion() > existing.getVersion()) {
                    latestSubmissions.put(s.getTeam().getId(), s);
                } else if (s.getVersion().equals(existing.getVersion()) && s.getId() > existing.getId()) {
                    latestSubmissions.put(s.getTeam().getId(), s);
                }
            }
        }
        List<Submission> allSubmissions = new ArrayList<>(latestSubmissions.values());

        List<Team> participatingTeams = getParticipatingTeams(round);
        Map<Team, Double> teamScores = new HashMap<>();
        for (Team team : participatingTeams) {
            teamScores.put(team, 0.0);
        }
        for (Submission s : allSubmissions) {
            if (teamScores.containsKey(s.getTeam())) {
                List<Score> scores = scoreRepository.findBySubmissionId(s.getId());

                double totalScore = scores.stream()
                        .mapToDouble(sc -> sc.getTotalScore() != null ? sc.getTotalScore() : 0.0).sum();
                long judgeCount = scores.stream().filter(sc -> sc.getJudge() != null).map(sc -> sc.getJudge().getId())
                        .distinct().count();
                double avgScore = judgeCount > 0 ? totalScore / judgeCount : (scores.isEmpty() ? 0.0 : totalScore);

                teamScores.put(s.getTeam(), avgScore);
            }
        }

        List<Map.Entry<Team, Double>> sortedTeams = new ArrayList<>(teamScores.entrySet());
        sortedTeams.sort((a, b) -> Double.compare(b.getValue(), a.getValue()));

        List<ProcessRankingsResponse.TeamRankingEntry> results = new ArrayList<>();
        int rank = 1;
        for (Map.Entry<Team, Double> entry : sortedTeams) {
            results.add(ProcessRankingsResponse.TeamRankingEntry.builder()
                    .teamId(entry.getKey().getId())
                    .teamName(entry.getKey().getName())
                    .categoryName(actualCategoryName)
                    .averageScore(Math.round(entry.getValue() * 100.0) / 100.0)
                    .rank(rank)
                    .status(rank <= topN ? "QUALIFIED" : "ELIMINATED")
                    .build());
            rank++;
        }

        rankingResultRepository.deleteByRoundId(round.getId());

        for (ProcessRankingsResponse.TeamRankingEntry entry : results) {
            Team team = teamRepository.findById(entry.getTeamId()).orElse(null);
            if (team == null)
                continue;

            rankingResultRepository.save(RankingResult.builder()
                    .round(round)
                    .category(round.getCategory())
                    .team(team)
                    .rankNo(entry.getRank())
                    .finalScore(entry.getAverageScore())
                    .qualificationStatus(entry.getStatus())
                    .datePublishedAt(null)
                    .build());
        }

        return ProcessRankingsResponse.builder()
                .contestId(contestId)
                .contestName(contestName)
                .roundName(roundName)
                .topN(topN)
                .qualifiedCount((int) results.stream().filter(r -> "QUALIFIED".equals(r.getStatus())).count())
                .eliminatedCount((int) results.stream().filter(r -> "ELIMINATED".equals(r.getStatus())).count())
                .totalProcessed(results.size())
                .results(results)
                .build();
    }

    @Transactional
    public void publishLeaderboard(com.fpt.shms.be.dto.PublishLeaderboardRequest request) throws Exception {
        Round round = roundRepository.findById(request.getRoundId())
                .orElseThrow(() -> new IllegalArgumentException("Round not found"));

        // Must publish scores first
        if (!submissionRepository.existsByRoundIdAndHistoryLogIsPublished(round.getId())) {
            throw new IllegalArgumentException("You must Publish Score before publishing results.");
        }

        // Must wait until Review Calibration period has concluded
        if (round.getReviewCalibrationAt() != null && LocalDateTime.now().isBefore(round.getReviewCalibrationAt())) {
            throw new IllegalArgumentException(
                    "Cannot publish results before the Review Calibration period has concluded.");
        }

        List<RankingResult> results = rankingResultRepository.findByRoundId(round.getId());
        if (results.isEmpty()) {
            throw new IllegalArgumentException("Leaderboard must be generated before publishing");
        }

        if (round.getPublishResultAt() == null || round.getPublishResultAt().isAfter(LocalDateTime.now())) {
            round.setPublishResultAt(LocalDateTime.now());
            round.setState(Round.RoundState.CLOSED);
            roundRepository.save(round);
        }

        for (RankingResult rr : results) {
            rr.setDatePublishedAt(LocalDateTime.now());
            rankingResultRepository.save(rr);

            auditLogService.log("PUBLISH_LEADERBOARD", "RankingResult",
                    rr.getTeam() != null ? rr.getTeam().getName() : "Leaderboard", "PENDING",
                    rr.getQualificationStatus(), "Published Leaderboard");
        }
    }

    @Transactional
    public void publishScores(Long roundId) {
        Round round = roundRepository.findById(roundId)
                .orElseThrow(() -> new IllegalArgumentException("Round not found"));

        if (round.getPublishResultAt() != null && !round.getPublishResultAt().isAfter(LocalDateTime.now())) {
            throw new IllegalArgumentException(
                    "Results have already been published. Cannot change the score publication state.");
        }

        if (round.getGradingDeadlineAt() != null && LocalDateTime.now().isBefore(round.getGradingDeadlineAt())) {
            throw new IllegalArgumentException("Cannot publish scores before the grading deadline.");
        }

        if (round.getReviewCalibrationAt() == null) {
            round.setReviewCalibrationAt(LocalDateTime.now());
            roundRepository.save(round);
        }

        // Snapshot current average scores into historyLog of each team's latest
        // submission for this round
        List<Submission> allSubmissions = submissionRepository.findByRoundId(roundId);
        java.util.Map<Long, Submission> latestSubByTeam = new java.util.HashMap<>();
        for (Submission s : allSubmissions) {
            if (s.getTeam() == null)
                continue;
            Long teamId = s.getTeam().getId();
            Submission existing = latestSubByTeam.get(teamId);
            if (existing == null) {
                latestSubByTeam.put(teamId, s);
            } else if (s.getVersion() != null && existing.getVersion() != null) {
                if (s.getVersion() > existing.getVersion()) {
                    latestSubByTeam.put(teamId, s);
                } else if (s.getVersion().equals(existing.getVersion()) && s.getId() > existing.getId()) {
                    latestSubByTeam.put(teamId, s);
                }
            }
        }

        for (Submission sub : latestSubByTeam.values()) {
            boolean hasSubmission = !"MISSED_DEADLINE".equals(sub.getStatus());
            List<Score> scores = scoreRepository.findBySubmissionId(sub.getId());
            List<Score> judgeScores = scores.stream().filter(sc -> !"MENTOR_FEEDBACK".equals(sc.getStatus())).toList();
            boolean isAutoZero = "MISSED_DEADLINE".equals(sub.getStatus());
            List<Score> validJudgeScores = judgeScores.stream().filter(sc -> !"MISSED_DEADLINE".equals(sc.getStatus()))
                    .toList();
            boolean isGraded = !validJudgeScores.isEmpty();
            Double avgRoundScore = null;
            if (isGraded) {
                avgRoundScore = validJudgeScores.stream().map(Score::getTotalScore).filter(java.util.Objects::nonNull)
                        .mapToDouble(Double::doubleValue).average().orElse(0.0);
            } else if (isAutoZero) {
                avgRoundScore = 0.0;
                isGraded = true;
            }

            List<java.util.Map<String, Object>> detailedScores = new ArrayList<>();
            if (isGraded || isAutoZero) {
                java.util.Map<Long, List<ScoreDetail>> groupedByRubric = judgeScores.stream()
                        .flatMap(
                                s -> s.getDetails() != null ? s.getDetails().stream() : java.util.stream.Stream.empty())
                        .filter(d -> d.getContestRubricDetail() != null)
                        .collect(Collectors.groupingBy(d -> d.getContestRubricDetail().getId()));

                for (List<ScoreDetail> detailList : groupedByRubric.values()) {
                    if (detailList.isEmpty())
                        continue;
                    ContestRubricDetails rubricInfo = detailList.get(0).getContestRubricDetail();
                    double avgPoints = detailList.stream().map(ScoreDetail::getRawScore)
                            .filter(java.util.Objects::nonNull).mapToDouble(Double::doubleValue).average().orElse(0.0);
                    String combinedFeedback = detailList.stream().map(ScoreDetail::getFeedback)
                            .filter(f -> f != null && !f.trim().isEmpty()).collect(Collectors.joining("\n- "));
                    if (!combinedFeedback.isEmpty())
                        combinedFeedback = "- " + combinedFeedback;

                    java.util.Map<String, Object> ds = new java.util.HashMap<>();
                    ds.put("criteriaName", rubricInfo.getCriteriaName());
                    ds.put("weight", rubricInfo.getPercentageWeight());
                    ds.put("pointsAwarded", Math.round(avgPoints * 100.0) / 100.0);
                    ds.put("feedback", combinedFeedback);
                    detailedScores.add(ds);
                }
            }

            java.util.Map<String, Object> snapshot = new java.util.HashMap<>();
            snapshot.put("avgRoundScore", avgRoundScore != null ? Math.round(avgRoundScore * 100.0) / 100.0 : null);
            snapshot.put("isGraded", isGraded);
            snapshot.put("hasSubmission", hasSubmission);
            snapshot.put("detailedScores", detailedScores);

            try {
                String json = new com.fasterxml.jackson.databind.ObjectMapper().writeValueAsString(snapshot);
                sub.setHistoryLog(json);
                submissionRepository.save(sub);
            } catch (Exception e) {
                e.printStackTrace();
            }
        }

        auditLogService.log("PUBLISH_SCORES", "Round",
                round.getPhaseName() != null ? round.getPhaseName() : "Round",
                "UNPUBLISHED", "PUBLISHED", "Scores published - rankings not yet visible");
    }
}