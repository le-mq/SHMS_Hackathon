package com.fpt.shms.be.service;

import com.fpt.shms.be.dto.ProcessRankingsResponse;
import com.fpt.shms.be.dto.RankingReadinessResponse;
import com.fpt.shms.be.model.*;
import com.fpt.shms.be.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class RankingAdminService {

    private final ContestRepository contestRepository;
    private final CategoryRepository categoryRepository;
    private final RoundRepository roundRepository;
    private final SubmissionRepository submissionRepository;
    private final ScoreRepository scoreRepository;
    private final JudgeAssignmentRepository judgeAssignmentRepository;
    private final UserRepository userRepository;
    private final RankingResultRepository rankingResultRepository;

    public RankingReadinessResponse getReadiness(Long contestId, String roundName) {
        // Find all categories for contest
        List<Category> categories = categoryRepository.findByContestId(contestId);
        List<Long> categoryIds = categories.stream().map(Category::getId).toList();

        // Find all submissions for teams in these categories
        List<Submission> allSubmissions = submissionRepository.findAll().stream()
                .filter(s -> s.getTeam() != null && s.getTeam().getCategory() != null && 
                             categoryIds.contains(s.getTeam().getCategory().getId()))
                .toList();
        
        // Group by Team and get latest submission per team
        Map<Long, Submission> latestSubmissions = new HashMap<>();
        for (Submission s : allSubmissions) {
            Submission existing = latestSubmissions.get(s.getTeam().getId());
            if (existing == null || (s.getVersion() != null && existing.getVersion() != null && s.getVersion() > existing.getVersion())) {
                latestSubmissions.put(s.getTeam().getId(), s);
            }
        }
        allSubmissions = new ArrayList<>(latestSubmissions.values());

        // Find all judge assignments for these categories
        List<JudgeAssignment> assignments = judgeAssignmentRepository.findAll().stream()
                .filter(ja -> categoryIds.contains(ja.getCategory().getId()))
                .toList();

        Set<User> judges = assignments.stream().map(JudgeAssignment::getUser).collect(Collectors.toSet());

        // Check readiness
        List<RankingReadinessResponse.Evaluator> evaluatorList = new ArrayList<>();
        boolean allReady = true;

        for (User judge : judges) {
            // Did this judge score all submissions in their assigned categories for this round?
            List<Long> judgeAssignedCategoryIds = assignments.stream()
                    .filter(ja -> ja.getUser().getId().equals(judge.getId()))
                    .map(ja -> ja.getCategory().getId())
                    .toList();

            List<Submission> assignedSubmissions = allSubmissions.stream()
                    .filter(s -> judgeAssignedCategoryIds.contains(s.getTeam().getCategory().getId()))
                    .toList();

            boolean judgeReady = true;
            for (Submission s : assignedSubmissions) {
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

        // Calculate summary
        Map<Team, Double> teamScores = new HashMap<>();
        for (Submission s : allSubmissions) {
            List<Score> scores = scoreRepository.findAll().stream() // Ideally this should be a DB query
                    .filter(sc -> sc.getSubmission().getId().equals(s.getId()))
                    .toList();
            
            double totalScore = scores.stream().mapToDouble(Score::getPointsAwarded).sum();
            long judgeCount = scores.stream().map(sc -> sc.getJudge().getId()).distinct().count();
            double avgScore = judgeCount > 0 ? totalScore / judgeCount : 0.0;
            
            teamScores.put(s.getTeam(), avgScore);
        }

        double totalAvg = teamScores.values().stream().mapToDouble(Double::doubleValue).average().orElse(0.0);
        double minScore = teamScores.values().stream().mapToDouble(Double::doubleValue).min().orElse(0.0);
        double maxScore = teamScores.values().stream().mapToDouble(Double::doubleValue).max().orElse(0.0);

        // Calculate real histogram
        int[] bins = new int[10];
        for (Double score : teamScores.values()) {
            int binIndex = (int) (score / 10.0);
            if (binIndex >= 10) binIndex = 9; // Handle score of 100
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
                .allReady(allReady || evaluatorList.isEmpty()) // If no evaluators, technically ready
                .build();
    }

    public ProcessRankingsResponse processRankings(Long contestId, String roundName, int topN) {
        // Just return the sorted top N
        RankingReadinessResponse readiness = getReadiness(contestId, roundName);
        if (!readiness.isAllReady()) {
            throw new IllegalArgumentException("Not all evaluators have finalized scores");
        }
        Contest contest = contestRepository.findById(contestId).orElseThrow(() -> new IllegalArgumentException("Contest not found"));
        String contestName = contest.getName();

        List<Category> categories = categoryRepository.findByContestId(contestId);
        List<Long> categoryIds = categories.stream().map(Category::getId).toList();

        // Find all submissions for teams in these categories
        List<Submission> allSubmissionsRaw = submissionRepository.findAll().stream()
                .filter(s -> s.getTeam() != null && s.getTeam().getCategory() != null && 
                             categoryIds.contains(s.getTeam().getCategory().getId()))
                .toList();

        // Group by Team and get latest submission per team
        Map<Long, Submission> latestSubmissions = new HashMap<>();
        for (Submission s : allSubmissionsRaw) {
            Submission existing = latestSubmissions.get(s.getTeam().getId());
            if (existing == null || (s.getVersion() != null && existing.getVersion() != null && s.getVersion() > existing.getVersion())) {
                latestSubmissions.put(s.getTeam().getId(), s);
            }
        }
        List<Submission> allSubmissions = new ArrayList<>(latestSubmissions.values());

        Map<Team, Double> teamScores = new HashMap<>();
        for (Submission s : allSubmissions) {
            List<Score> scores = scoreRepository.findAll().stream()
                    .filter(sc -> sc.getSubmission().getId().equals(s.getId()))
                    .toList();
            
            double totalScore = scores.stream().mapToDouble(Score::getPointsAwarded).sum();
            long judgeCount = scores.stream().map(sc -> sc.getJudge().getId()).distinct().count();
            double avgScore = judgeCount > 0 ? totalScore / judgeCount : 0.0;
            
            teamScores.put(s.getTeam(), avgScore);
        }

        List<Map.Entry<Team, Double>> sortedTeams = new ArrayList<>(teamScores.entrySet());
        sortedTeams.sort((a, b) -> Double.compare(b.getValue(), a.getValue()));

        List<ProcessRankingsResponse.TeamRankingEntry> results = new ArrayList<>();
        int rank = 1;
        for (Map.Entry<Team, Double> entry : sortedTeams) {
            results.add(ProcessRankingsResponse.TeamRankingEntry.builder()
                    .teamId(entry.getKey().getId())
                    .teamName(entry.getKey().getName())
                    .categoryName(entry.getKey().getCategory() != null ? entry.getKey().getCategory().getName() : "Unknown")
                    .averageScore(Math.round(entry.getValue() * 100.0) / 100.0)
                    .rank(rank)
                    .status(rank <= topN ? "QUALIFIED" : "ELIMINATED")
                    .build());
            rank++;
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
        ProcessRankingsResponse rankings = processRankings(request.getContestId(), request.getRoundName(), request.getTopN());
        Round round = roundRepository.findByContestId(request.getContestId()).stream()
                .filter(r -> request.getRoundName() == null || request.getRoundName().equalsIgnoreCase(r.getPhaseName()))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Round not found"));

        rankingResultRepository.deleteByRoundId(round.getId());
        for (ProcessRankingsResponse.TeamRankingEntry entry : rankings.getResults()) {
            Team team = submissionRepository.findAll().stream()
                    .map(Submission::getTeam)
                    .filter(t -> t != null && t.getId().equals(entry.getTeamId()))
                    .findFirst()
                    .orElse(null);
            if (team == null) {
                continue;
            }
            rankingResultRepository.save(RankingResult.builder()
                    .round(round)
                    .category(team.getCategory())
                    .team(team)
                    .rankNo(entry.getRank())
                    .finalScore(entry.getAverageScore())
                    .qualificationStatus(entry.getStatus())
                    .datePublishedAt(LocalDateTime.now())
                    .build());
        }
    }
}
