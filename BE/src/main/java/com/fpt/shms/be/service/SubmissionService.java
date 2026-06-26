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
import java.util.stream.Collectors;

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

        LocalDateTime now = LocalDateTime.now();
        if (round.getSubmissionOpen() != null && now.isBefore(round.getSubmissionOpen())) {
            throw new IllegalArgumentException("The submission portal for this round is not yet open!");
        }

        if (round.getSubmissionDeadline() != null && now.isAfter(round.getSubmissionDeadline())) {
            throw new IllegalArgumentException("The submission deadline has passed. The submission portal is closed!");
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

    public com.fpt.shms.be.dto.TeamScoreDetailsResponse getTeamScoreDetails(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        List<TeamMembership> memberships = teamMembershipRepository.findByUserId(user.getId());
        if (memberships.isEmpty()) {
            throw new IllegalArgumentException("User is not in any team");
        }
        Team team = memberships.get(0).getTeam();

        String trackName = team.getContest() != null ? team.getContest().getName() : "N/A";
        Double overallTotalScore = 0.0;
        Integer overallRank = null;

        List<Submission> submissions = submissionRepository.findByTeamId(team.getId());
        List<com.fpt.shms.be.dto.TeamScoreDetailsResponse.RoundScoreDto> roundScores = new ArrayList<>();

        for (Submission sub : submissions) {
            if (sub.getRound() == null) continue;

            LocalDateTime now = LocalDateTime.now();
            if (sub.getRound().getPublishResultAt() == null || now.isBefore(sub.getRound().getPublishResultAt())) {
                continue;
            }

            List<Score> scores = scoreRepository.findBySubmissionId(sub.getId());
            if (scores.isEmpty()) continue;

            double avgRoundScore = scores.stream()
                    .map(Score::getTotalScore)
                    .filter(java.util.Objects::nonNull)
                    .mapToDouble(Double::doubleValue)
                    .average()
                    .orElse(0.0);

            overallTotalScore += avgRoundScore;

            List<ScoreDetail> allDetails = scores.stream()
                    .flatMap(s -> s.getDetails() != null ? s.getDetails().stream() : java.util.stream.Stream.empty())
                    .toList();

            java.util.Map<Long, List<ScoreDetail>> groupedByRubric = allDetails.stream()
                    .filter(d -> d.getContestRubricDetail() != null)
                    .collect(Collectors.groupingBy(d -> d.getContestRubricDetail().getId()));

            List<com.fpt.shms.be.dto.TeamScoreDetailsResponse.RubricScoreDto> detailedScores = new ArrayList<>();

            for (List<ScoreDetail> detailList : groupedByRubric.values()) {
                if (detailList.isEmpty()) continue;

                ContestRubricDetails rubricInfo = detailList.get(0).getContestRubricDetail();

                double avgPoints = detailList.stream()
                        .map(ScoreDetail::getRawScore)
                        .filter(java.util.Objects::nonNull)
                        .mapToDouble(Double::doubleValue)
                        .average()
                        .orElse(0.0);

                String combinedFeedback = detailList.stream()
                        .map(ScoreDetail::getFeedback)
                        .filter(f -> f != null && !f.trim().isEmpty())
                        .collect(Collectors.joining("\n- "));

                if (!combinedFeedback.isEmpty()) {
                    combinedFeedback = "- " + combinedFeedback;
                }

                detailedScores.add(com.fpt.shms.be.dto.TeamScoreDetailsResponse.RubricScoreDto.builder()
                        .criteriaName(rubricInfo.getCriteriaName())
                        .weight(rubricInfo.getPercentageWeight())
                        .pointsAwarded(Math.round(avgPoints * 100.0) / 100.0)
                        .feedback(combinedFeedback)
                        .build());
            }

            roundScores.add(com.fpt.shms.be.dto.TeamScoreDetailsResponse.RoundScoreDto.builder()
                    .roundId(sub.getRound().getId())
                    .roundName(sub.getRound().getPhaseName())
                    .totalScore(Math.round(avgRoundScore * 100.0) / 100.0)
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
}
