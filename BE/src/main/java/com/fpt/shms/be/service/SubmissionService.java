package com.fpt.shms.be.service;

import com.fpt.shms.be.dto.SubmissionPageResponse;
import com.fpt.shms.be.dto.SubmitProjectRequest;
import com.fpt.shms.be.model.*;
import com.fpt.shms.be.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Objects;

@Service
@RequiredArgsConstructor
public class SubmissionService {

    private final SubmissionRepository submissionRepository;
    private final TeamMembershipRepository teamMembershipRepository;
    private final UserRepository userRepository;
    private final RoundRepository roundRepository;
    private final ScoreRepository scoreRepository;
    private final RankingResultRepository rankingResultRepository;

    @Transactional
    public SubmissionPageResponse submitProject(SubmitProjectRequest request, String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        List<TeamMembership> memberships = teamMembershipRepository.findByUserId(user.getId());
        if (memberships.isEmpty()) {
            throw new IllegalArgumentException("User is not in any team");
        }

        TeamMembership membership = memberships.get(0);

        if (!"LEADER".equals(membership.getRole())) {
            throw new IllegalArgumentException("Only Team Leaders can submit the project");
        }

        Team team = membership.getTeam();

        if ("CANCELLED".equals(team.getStatus())) {
            throw new IllegalArgumentException("Your team has been disqualified and cannot submit the project");
        }

        if (!"APPROVED".equals(team.getStatus())) {
            throw new IllegalArgumentException("Your team registration is not APPROVED yet");
        }

        Round round = null;
        if (request.getRoundId() != null) {
            round = roundRepository.findById(request.getRoundId())
                    .orElseThrow(() -> new IllegalArgumentException("Round not found"));
        }

        validateRoundSubmissionAccess(team, round);

        List<Submission> oldSubmissions = submissionRepository.findByTeamId(team.getId());
        Submission existingSub = null;
        for (Submission sub : oldSubmissions) {
            boolean sameRound = (round == null && sub.getRound() == null) ||
                    (round != null && sub.getRound() != null && round.getId().equals(sub.getRound().getId()));
            if (sameRound) {
                existingSub = sub;
                break;
            }
        }

        if (existingSub != null) {
            int oldVersion = existingSub.getVersion() != null ? existingSub.getVersion() : 1;
            String oldTime = existingSub.getSubmittedAt() != null ? existingSub.getSubmittedAt().toString() : LocalDateTime.now().toString();
            String currentLog = existingSub.getHistoryLog() != null ? existingSub.getHistoryLog() : "";

            existingSub.setHistoryLog(currentLog + oldVersion + "|" + oldTime + ";");
            existingSub.setVersion(oldVersion + 1);
            existingSub.setProjectRepositoryUrl(request.getGithubRepoUrl());
            existingSub.setDemoVideoUrl(request.getLiveDemoUrl());
            existingSub.setDocumentationUrl(request.getDocsUrl());
            existingSub.setPresentationSlideUrl(request.getSlideUrl());
            existingSub.setSubmittedAt(LocalDateTime.now());
            existingSub.setStatus("SUBMITTED");
            submissionRepository.save(existingSub);
        } else {
            Submission submission = Submission.builder()
                    .team(team)
                    .round(round)
                    .projectRepositoryUrl(request.getGithubRepoUrl())
                    .demoVideoUrl(request.getLiveDemoUrl())
                    .documentationUrl(request.getDocsUrl())
                    .presentationSlideUrl(request.getSlideUrl())
                    .version(1)
                    .historyLog("")
                    .submittedAt(LocalDateTime.now())
                    .status("SUBMITTED")
                    .build();
            submissionRepository.save(submission);
        }

        return getSubmissionPageData(username);
    }

    public SubmissionPageResponse getSubmissionPageData(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        List<TeamMembership> memberships = teamMembershipRepository.findByUserId(user.getId());
        if (memberships.isEmpty()) {
            throw new IllegalArgumentException("User is not in any team");
        }

        TeamMembership membership = memberships.get(0);
        Team team = membership.getTeam();

        String contestName = team.getContest() != null ? team.getContest().getName() : "Not Registered";
        String contestStatus = team.getContest() != null ? team.getContest().getStatus().name() : "N/A";

        List<SubmissionPageResponse.RoundDto> roundDtos = new ArrayList<>();
        com.fpt.shms.be.model.Contest contest = team.getContest();
        if (contest != null) {
            List<Round> rounds = roundRepository.findByContestId(contest.getId());
            rounds.sort(roundComparator());
            for (Round r : rounds) {
                Submission roundSubmission = submissionRepository.findByTeamIdAndRoundId(team.getId(), r.getId()).orElse(null);
                ScoreSummary scoreSummary = getScoreSummary(roundSubmission);
                EligibilityResult eligibility = getRoundEligibility(team, r, rounds);

                roundDtos.add(SubmissionPageResponse.RoundDto.builder()
                        .id(r.getId())
                        .name(r.getPhaseName())
                        .status(r.getState().name())
                        .submissionOpen(r.getSubmissionOpen())
                        .submissionDeadline(r.getSubmissionDeadline())
                        .eligible(eligibility.eligible)
                        .lockedReason(eligibility.lockedReason)
                        .evaluated(scoreSummary.evaluated)
                        .totalScore(scoreSummary.totalScore)
                        .build());
            }
        }

        List<Submission> submissions = submissionRepository.findByTeamId(team.getId());

        List<SubmissionPageResponse.HistoryDto> historyDtos = new ArrayList<>();
        for (Submission s : submissions) {
            if (s.getHistoryLog() != null && !s.getHistoryLog().isEmpty()) {
                String[] logs = s.getHistoryLog().split(";");
                for (String log : logs) {
                    if (log.isEmpty()) continue;
                    String[] parts = log.split("\\|");
                    if (parts.length == 2) {
                        try {
                            historyDtos.add(SubmissionPageResponse.HistoryDto.builder()
                                    .roundId(s.getRound() != null ? s.getRound().getId() : null)
                                    .version(Integer.parseInt(parts[0]))
                                    .timestamp(LocalDateTime.parse(parts[1]))
                                    .status("ARCHIVED")
                                    .build());
                        } catch (Exception e) {}
                    }
                }
            }

            ScoreSummary scoreSummary = getScoreSummary(s);
            historyDtos.add(SubmissionPageResponse.HistoryDto.builder()
                    .roundId(s.getRound() != null ? s.getRound().getId() : null)
                    .version(s.getVersion() != null ? s.getVersion() : 1)
                    .timestamp(s.getSubmittedAt())
                    .status(scoreSummary.evaluated ? "EVALUATED" : s.getStatus())
                    .githubRepoUrl(s.getProjectRepositoryUrl())
                    .liveDemoUrl(s.getDemoVideoUrl())
                    .docsUrl(s.getDocumentationUrl())
                    .slideUrl(s.getPresentationSlideUrl())
                    .evaluated(scoreSummary.evaluated)
                    .totalScore(scoreSummary.totalScore)
                    .build());
        }

        historyDtos.sort((h1, h2) -> {
            Integer v1 = h1.getVersion() != null ? h1.getVersion() : 0;
            Integer v2 = h2.getVersion() != null ? h2.getVersion() : 0;
            return v2.compareTo(v1);
        });

        return SubmissionPageResponse.builder()
                .internalRole(membership.getRole())
                .contestName(contestName)
                .contestStatus(contestStatus)
                .rounds(roundDtos)
                .history(historyDtos)
                .build();
    }

    private void validateRoundSubmissionAccess(Team team, Round round) {
        if (round == null) {
            return;
        }

        if (round.getContest() != null && team.getContest() != null
                && !round.getContest().getId().equals(team.getContest().getId())) {
            throw new IllegalArgumentException("Selected round does not belong to your registered contest.");
        }

        if (!Round.RoundState.ACTIVE.equals(round.getState())) {
            throw new IllegalArgumentException("This round is not active yet. You cannot submit.");
        }

        List<Round> contestRounds = round.getContest() != null
                ? roundRepository.findByContestId(round.getContest().getId())
                : List.of(round);
        contestRounds.sort(roundComparator());

        EligibilityResult eligibility = getRoundEligibility(team, round, contestRounds);
        if (!eligibility.eligible) {
            throw new IllegalArgumentException(eligibility.lockedReason);
        }
    }

    private EligibilityResult getRoundEligibility(Team team, Round round, List<Round> contestRounds) {
        if (round == null) {
            return new EligibilityResult(true, null);
        }

        int roundIndex = -1;
        for (int i = 0; i < contestRounds.size(); i++) {
            if (contestRounds.get(i).getId().equals(round.getId())) {
                roundIndex = i;
                break;
            }
        }

        if (roundIndex <= 0) {
            return new EligibilityResult(true, null);
        }

        Round previousRound = contestRounds.get(roundIndex - 1);
        boolean qualified = rankingResultRepository.findQualifiedByRoundId(previousRound.getId())
                .stream()
                .anyMatch(result -> result.getTeam() != null && result.getTeam().getId().equals(team.getId()));

        if (qualified) {
            return new EligibilityResult(true, null);
        }

        String previousRoundName = previousRound.getPhaseName() != null ? previousRound.getPhaseName() : "the previous round";
        return new EligibilityResult(false, "Your team has not qualified from " + previousRoundName + " yet.");
    }

    private Comparator<Round> roundComparator() {
        return Comparator
                .comparing(Round::getRoundOrder, Comparator.nullsLast(Integer::compareTo))
                .thenComparing(Round::getSubmissionOpen, Comparator.nullsLast(LocalDateTime::compareTo))
                .thenComparing(Round::getId, Comparator.nullsLast(Long::compareTo));
    }

    private ScoreSummary getScoreSummary(Submission submission) {
        if (submission == null || submission.getId() == null) {
            return new ScoreSummary(false, null);
        }

        List<Score> scores = scoreRepository.findBySubmissionId(submission.getId());
        if (scores.isEmpty()) {
            return new ScoreSummary(false, null);
        }

        double averageScore = scores.stream()
                .map(score -> score.getTotalScore() != null ? score.getTotalScore() : score.getPointsAwarded())
                .filter(score -> score != null)
                .mapToDouble(Double::doubleValue)
                .average()
                .orElse(0.0);

        return new ScoreSummary(true, Math.round(averageScore * 100.0) / 100.0);
    }

    private static class EligibilityResult {
        private final boolean eligible;
        private final String lockedReason;

        private EligibilityResult(boolean eligible, String lockedReason) {
            this.eligible = eligible;
            this.lockedReason = lockedReason;
        }
    }

    private static class ScoreSummary {
        private final boolean evaluated;
        private final Double totalScore;

        private ScoreSummary(boolean evaluated, Double totalScore) {
            this.evaluated = evaluated;
            this.totalScore = totalScore;
        }
    }

    @Transactional(readOnly = true)
    public com.fpt.shms.be.dto.TeamScoreDetailsResponse getTeamScoreDetails(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        List<TeamMembership> memberships = teamMembershipRepository.findByUserId(user.getId());
        if (memberships.isEmpty()) {
            throw new IllegalArgumentException("User is not in any team");
        }
        Team team = memberships.get(0).getTeam();

        String trackName = "N/A";
        Double overallTotalScore = 0.0;
        Integer overallRank = null;

        List<Round> contestRounds = new ArrayList<>();
        if (team.getContest() != null) {
            contestRounds.addAll(roundRepository.findByContestId(team.getContest().getId()));
            contestRounds.sort(roundComparator());
        }

        List<Submission> teamSubmissions = submissionRepository.findByTeamId(team.getId());
        List<Score> teamScores = new ArrayList<>();
        for (Submission submission : teamSubmissions) {
            teamScores.addAll(scoreRepository.findBySubmissionId(submission.getId()));
        }

        if (contestRounds.isEmpty()) {
            for (Submission submission : teamSubmissions) {
                if (submission.getRound() != null
                        && contestRounds.stream().noneMatch(round -> round.getId().equals(submission.getRound().getId()))) {
                    contestRounds.add(submission.getRound());
                }
            }
            contestRounds.sort(roundComparator());
        }

        List<com.fpt.shms.be.dto.TeamScoreDetailsResponse.RoundScoreDto> roundScores = new ArrayList<>();

        for (int roundIndex = 0; roundIndex < contestRounds.size(); roundIndex++) {
            Round round = contestRounds.get(roundIndex);
            List<Score> scores = teamScores.stream()
                    .filter(score -> scoreBelongsToRound(score, round))
                    .toList();

            double totalRoundScore = 0;
            List<com.fpt.shms.be.dto.TeamScoreDetailsResponse.RubricScoreDto> detailedScores = new ArrayList<>();
            scores.sort(Comparator.comparing(Score::getId, Comparator.nullsLast(Long::compareTo)));

            int judgeNumber = 1;
            for (Score score : scores) {
                double scoreTotal = score.getTotalScore() != null ? score.getTotalScore() : score.getPointsAwarded();
                totalRoundScore += scoreTotal;
                String judgeLabel = "Giám khảo " + judgeNumber++;

                if (score.getDetails() == null || score.getDetails().isEmpty()) {
                    detailedScores.add(com.fpt.shms.be.dto.TeamScoreDetailsResponse.RubricScoreDto.builder()
                            .judgeLabel(judgeLabel)
                            .judgeTotalScore(roundPercentage(scoreTotal))
                            .criteriaName("Điểm tổng")
                            .weight(resolveRubricTotalWeight(score))
                            .pointsAwarded(roundPercentage(scoreTotal))
                            .feedback(score.getFeedback())
                            .build());
                    continue;
                }

                List<ScoreDetail> scoreDetails = new ArrayList<>(score.getDetails());
                scoreDetails.sort(Comparator.comparing(
                        detail -> detail.getContestRubricDetail() != null ? detail.getContestRubricDetail().getId() : detail.getId(),
                        Comparator.nullsLast(Long::compareTo)
                ));

                for (ScoreDetail detail : scoreDetails) {
                    ContestRubricDetails rubricDetail = detail.getContestRubricDetail();
                    detailedScores.add(com.fpt.shms.be.dto.TeamScoreDetailsResponse.RubricScoreDto.builder()
                            .judgeLabel(judgeLabel)
                            .judgeTotalScore(roundPercentage(scoreTotal))
                            .criteriaName(rubricDetail != null ? rubricDetail.getCriteriaName() : "Tiêu chí")
                            .weight(rubricDetail != null && rubricDetail.getPercentageWeight() != null ? roundPercentage(rubricDetail.getPercentageWeight()) : 0.0)
                            .pointsAwarded(detail.getRawScore() != null ? roundPercentage(detail.getRawScore()) : 0.0)
                            .feedback(detail.getFeedback())
                            .build());
                }
            }

            double avgScore = scores.isEmpty() ? 0.0 : totalRoundScore / scores.size();
            overallTotalScore += avgScore;

            roundScores.add(com.fpt.shms.be.dto.TeamScoreDetailsResponse.RoundScoreDto.builder()
                    .roundId(round.getId())
                    .roundName(resolveRoundDisplayName(round, roundIndex))
                    .totalScore(Math.round(avgScore * 100.0) / 100.0)
                    .detailedScores(detailedScores)
                    .build());
        }

        return com.fpt.shms.be.dto.TeamScoreDetailsResponse.builder()
                .teamName(team.getName())
                .projectName(team.getName())
                .totalScore(Math.round(overallTotalScore * 100.0) / 100.0)
                .trackName(trackName)
                .rank(overallRank)
                .rounds(roundScores)
                .build();
    }

    private Double resolveRubricTotalWeight(Score score) {
        if (score.getDetails() == null || score.getDetails().isEmpty()) {
            return 100.0;
        }

        for (ScoreDetail detail : score.getDetails()) {
            ContestRubricDetails rubricDetail = detail.getContestRubricDetail();
            if (rubricDetail != null
                    && rubricDetail.getContestRubric() != null
                    && rubricDetail.getContestRubric().getTotalWeight() != null) {
                return roundPercentage(rubricDetail.getContestRubric().getTotalWeight());
            }
        }

        double totalDetailWeight = score.getDetails().stream()
                .map(ScoreDetail::getContestRubricDetail)
                .filter(Objects::nonNull)
                .map(ContestRubricDetails::getPercentageWeight)
                .filter(Objects::nonNull)
                .mapToDouble(Double::doubleValue)
                .sum();

        return totalDetailWeight > 0 ? roundPercentage(totalDetailWeight) : 100.0;
    }

    private Double roundPercentage(Double value) {
        return Math.round(value * 100.0) / 100.0;
    }

    private boolean scoreBelongsToRound(Score score, Round round) {
        Long rubricRoundId = resolveScoreRubricRoundId(score);
        if (rubricRoundId != null) {
            return round.getId().equals(rubricRoundId);
        }

        return score.getSubmission() != null
                && score.getSubmission().getRound() != null
                && round.getId().equals(score.getSubmission().getRound().getId());
    }

    private Long resolveScoreRubricRoundId(Score score) {
        if (score.getDetails() == null) {
            return null;
        }

        for (ScoreDetail detail : score.getDetails()) {
            ContestRubricDetails rubricDetail = detail.getContestRubricDetail();
            if (rubricDetail != null
                    && rubricDetail.getContestRubric() != null
                    && rubricDetail.getContestRubric().getRound() != null) {
                return rubricDetail.getContestRubric().getRound().getId();
            }
        }

        return null;
    }

    private String resolveRoundDisplayName(Round round, int roundIndex) {
        String roundName = round.getPhaseName();
        if (roundName != null && !roundName.isBlank() && !"Round".equalsIgnoreCase(roundName.trim())) {
            return roundName;
        }

        Integer roundOrder = round.getRoundOrder();
        return "Round " + (roundOrder != null ? roundOrder : roundIndex + 1);
    }
}
