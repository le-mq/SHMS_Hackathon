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
    private final TeamMentorRepository teamMentorRepository;

    private List<Team> getParticipatingTeams(Round round) {
        if (round.getCategory() == null) {
            return new ArrayList<>();
        }
        Long categoryId = round.getCategory().getId();
        List<Round> categoryRounds = roundRepository.findByCategoryIdOrderBySubmissionOpenAsc(categoryId);

        int idx = -1;
        for (int i = 0; i < categoryRounds.size(); i++) {
            if (categoryRounds.get(i).getId().equals(round.getId())) {
                idx = i;
                break;
            }
        }

        if (idx <= 0) {
            List<Team> teams = new ArrayList<>(teamMentorRepository.findByCategoryId(categoryId).stream()
                    .map(TeamMentor::getTeam)
                    .filter(t -> t != null && "APPROVED".equals(t.getStatus()))
                    .toList());

            List<com.fpt.shms.be.model.Submission> submissions = submissionRepository.findByRoundId(round.getId());
            for (com.fpt.shms.be.model.Submission sub : submissions) {
                Team t = sub.getTeam();
                if (t != null && "APPROVED".equals(t.getStatus())) {
                    boolean exists = false;
                    for (Team existing : teams) {
                        if (existing.getId().equals(t.getId())) {
                            exists = true;
                            break;
                        }
                    }
                    if (!exists) {
                        teams.add(t);
                    }
                }
            }
            return teams;
        } else {
            Round previousRound = categoryRounds.get(idx - 1);
            return rankingResultRepository.findQualifiedByRoundId(previousRound.getId()).stream()
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
                        s.getRound().getId().equals(round.getId()))
                .toList();

        Map<Long, Submission> latestSubmissions = new HashMap<>();
        for (Submission s : allSubmissionsRaw) {
            Submission existing = latestSubmissions.get(s.getTeam().getId());
            if (existing == null || (s.getVersion() != null && existing.getVersion() != null
                    && s.getVersion() > existing.getVersion())) {
                latestSubmissions.put(s.getTeam().getId(), s);
            }
        }
        List<Submission> allSubmissions = new ArrayList<>(latestSubmissions.values());

        List<JudgeAssignment> assignments = judgeAssignmentRepository.findAll().stream()
                .filter(ja -> roundCategoryIds.contains(ja.getCategory().getId()))
                .toList();

        Set<User> judges = assignments.stream().map(JudgeAssignment::getUser).collect(Collectors.toSet());

        List<RankingReadinessResponse.Evaluator> evaluatorList = new ArrayList<>();
        boolean allReady = true;

        for (User judge : judges) {
            List<Submission> assignedSubmissions = allSubmissions;

            boolean judgeReady = true;
            for (Submission s : assignedSubmissions) {
                if ("AUTO_ZERO".equals(s.getStatus()) || "DRAFT".equals(s.getStatus())) {
                    continue;
                }
                if (!scoreRepository.existsByJudgeIdAndSubmissionId(judge.getId(), s.getId())) {
                    judgeReady = false;
                    break;
                }
            }

            if (!judgeReady && !assignedSubmissions.isEmpty()) {
                allReady = false;
            }

            String date = judgeReady ? LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm")) : "";
            evaluatorList.add(RankingReadinessResponse.Evaluator.builder()
                    .name(judge.getUsername())
                    .dept("Hackathon Judge")
                    .status(judgeReady ? "Finalized" : "Pending")
                    .date(date)
                    .build());
        }

        List<Team> participatingTeams = getParticipatingTeams(round);
        Map<Team, Double> teamScores = new HashMap<>();
        for (Team team : participatingTeams) {
            teamScores.put(team, 0.0);
        }
        for (Submission s : allSubmissions) {
            if (teamScores.containsKey(s.getTeam())) {
                List<Score> scores = scoreRepository.findAll().stream()
                        .filter(sc -> sc.getSubmission().getId().equals(s.getId()))
                        .toList();

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
        RankingReadinessResponse readiness = getReadiness(contestId, roundId);
        if (!readiness.isAllReady()) {
            throw new IllegalArgumentException("Not all evaluators have finalized scores");
        }
        Contest contest = contestRepository.findById(contestId)
                .orElseThrow(() -> new IllegalArgumentException("Contest not found"));
        String contestName = contest.getName();

        Round round = roundRepository.findById(roundId)
                .orElseThrow(() -> new IllegalArgumentException("Round not found"));
        String roundName = round.getPhaseName();

        List<ContestRubric> rubricsForRound = new ArrayList<>();
        if (round.getCategory() != null) {
            rubricsForRound = contestRubricRepository.findByCategoryId(round.getCategory().getId());
        }
        String actualCategoryName = "Unknown";
        if (!rubricsForRound.isEmpty() && rubricsForRound.get(0).getCategory() != null) {
            actualCategoryName = rubricsForRound.get(0).getCategory().getName();
        }

        List<Submission> allSubmissionsRaw = submissionRepository.findAll().stream()
                .filter(s -> s.getTeam() != null && s.getTeam().getContest() != null &&
                        s.getTeam().getContest().getId().equals(contestId) &&
                        "APPROVED".equals(s.getTeam().getStatus()) &&
                        s.getRound().getId().equals(round.getId()))
                .toList();

        Map<Long, Submission> latestSubmissions = new HashMap<>();
        for (Submission s : allSubmissionsRaw) {
            Submission existing = latestSubmissions.get(s.getTeam().getId());
            if (existing == null || (s.getVersion() != null && existing.getVersion() != null
                    && s.getVersion() > existing.getVersion())) {
                latestSubmissions.put(s.getTeam().getId(), s);
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
                List<Score> scores = scoreRepository.findAll().stream()
                        .filter(sc -> sc.getSubmission().getId().equals(s.getId()))
                        .toList();

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
                    .category(rubricsForRound.isEmpty() ? null : rubricsForRound.get(0).getCategory())
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

        List<RankingResult> results = rankingResultRepository.findByRoundId(round.getId());
        if (results.isEmpty()) {
            throw new IllegalArgumentException("Leaderboard must be generated before publishing");
        }

        for (RankingResult rr : results) {
            rr.setDatePublishedAt(LocalDateTime.now());
            rankingResultRepository.save(rr);

            auditLogService.log("PUBLISH_LEADERBOARD", "RankingResult", rr.getTeam() != null ? rr.getTeam().getName() : "Leaderboard", "PENDING",
                    rr.getQualificationStatus(), "Published Leaderboard");
        }
    }
}