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
    private final com.fpt.shms.be.repository.ContestRubricRepository contestRubricRepository;
    private final com.fpt.shms.be.repository.ContestRubricDetailsRepository contestRubricDetailsRepository;

    @Transactional
    public SubmissionPageResponse submitProject(SubmitProjectRequest request, String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        List<TeamMembership> memberships = teamMembershipRepository.findByUserId(user.getId());
        if (memberships.isEmpty()) {
            throw new IllegalArgumentException("User is not in any team");
        }

        Long contestId = request.getContestId();
        if (contestId == null && request.getRoundId() != null) {
            Round round = roundRepository.findById(request.getRoundId()).orElse(null);
            if (round != null && round.getContest() != null) {
                contestId = round.getContest().getId();
            }
        }

        final Long finalContestId = contestId;

        TeamMembership membership = memberships.stream()
                .filter(m -> m.getTeam() != null && !"CLOSED".equalsIgnoreCase(m.getTeam().getStatus()) && (m.getTeam().getContest() == null || !com.fpt.shms.be.model.Contest.ContestStatus.CLOSED.equals(m.getTeam().getContest().getStatus())))
                .filter(m -> finalContestId == null || (m.getTeam().getContest() != null && m.getTeam().getContest().getId().equals(finalContestId)))
                .max(java.util.Comparator.<TeamMembership, Integer>comparing(m -> "APPROVED".equalsIgnoreCase(m.getTeam().getStatus()) ? 1 : 0)
                        .thenComparing(m -> "LEADER".equalsIgnoreCase(m.getRole()) ? 1 : 0)
                        .thenComparing(m -> m.getTeam().getId()))
                .orElse(memberships.get(0));

        if (!"LEADER".equals(membership.getRole())) {
            throw new IllegalArgumentException("Only the Team Leader can submit work.");
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

        if (round != null && round.getSubmissionRequirements() != null && !round.getSubmissionRequirements().trim().isEmpty() && !round.getSubmissionRequirements().trim().equals("[]")) {
            if (request.getSubmissionData() == null || request.getSubmissionData().trim().isEmpty() || request.getSubmissionData().trim().equals("{}") || request.getSubmissionData().trim().equals("[]")) {
                throw new IllegalArgumentException("Submission data is required for this round.");
            }
        }

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
            String oldStatus = existingSub.getStatus() != null ? existingSub.getStatus() : "SUBMITTED";
            String currentLog = existingSub.getHistoryLog() != null ? existingSub.getHistoryLog() : "";

            existingSub.setHistoryLog(currentLog + oldVersion + "|" + oldTime + "|" + oldStatus + ";");
            existingSub.setVersion(oldVersion + 1);
            existingSub.setSubmissionData(request.getSubmissionData());
            existingSub.setSubmittedAt(LocalDateTime.now());
            String newStatus = (request.getSubmissionType() != null && request.getSubmissionType().equalsIgnoreCase("DRAFT")) ? "DRAFT" : "SUBMITTED";
            existingSub.setStatus(newStatus);
            existingSub.setMentorFeedback(null);
            existingSub.setMentor(null);
            submissionRepository.save(existingSub);
        } else {
            String newStatus = (request.getSubmissionType() != null && request.getSubmissionType().equalsIgnoreCase("DRAFT")) ? "DRAFT" : "SUBMITTED";
            Submission submission = Submission.builder()
                    .team(team)
                    .round(round)
                    .version(1)
                    .historyLog("")
                    .submittedAt(LocalDateTime.now())
                    .status(newStatus)
                    .build();
            submission.setSubmissionData(request.getSubmissionData());
            submissionRepository.save(submission);
        }

        return getSubmissionPageData(username, finalContestId);
    }

    public SubmissionPageResponse getSubmissionPageData(String username, Long contestId) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        List<TeamMembership> memberships = teamMembershipRepository.findByUserId(user.getId());
        if (memberships.isEmpty()) {
            throw new IllegalArgumentException("User is not in any team");
        }

        TeamMembership membership = memberships.stream()
                .filter(m -> m.getTeam() != null && m.getTeam().getContest() != null)
                .filter(m -> com.fpt.shms.be.model.Contest.ContestStatus.ACTIVED.equals(m.getTeam().getContest().getStatus()))
                .filter(m -> contestId == null || m.getTeam().getContest().getId().equals(contestId))
                .max(java.util.Comparator.<TeamMembership, Integer>comparing(m -> "APPROVED".equalsIgnoreCase(m.getTeam().getStatus()) ? 1 : 0)
                        .thenComparing(m -> "LEADER".equalsIgnoreCase(m.getRole()) ? 1 : 0)
                        .thenComparing(m -> m.getTeam().getId()))
                .orElseGet(() -> memberships.stream()
                        .filter(m -> m.getTeam() != null && m.getTeam().getContest() != null)
                        .filter(m -> !com.fpt.shms.be.model.Contest.ContestStatus.UPCOMING.equals(m.getTeam().getContest().getStatus()))
                        .filter(m -> contestId == null || m.getTeam().getContest().getId().equals(contestId))
                        .max(java.util.Comparator.<TeamMembership, Integer>comparing(m -> "APPROVED".equalsIgnoreCase(m.getTeam().getStatus()) ? 1 : 0)
                                .thenComparing(m -> "LEADER".equalsIgnoreCase(m.getRole()) ? 1 : 0)
                                .thenComparing(m -> m.getTeam().getId()))
                        .orElse(null));

        if (membership == null) {
            throw new IllegalArgumentException("User is not in any active or past contest for submission");
        }

        Team team = membership.getTeam();

        String contestName = team.getContest() != null ? team.getContest().getName() : "Not Registered";
        String contestStatus = team.getContest() != null ? team.getContest().getStatus().name() : "N/A";

        List<Submission> submissions = submissionRepository.findByTeamId(team.getId());
        List<RankingResult> teamRankings = rankingResultRepository.findByTeamId(team.getId());

        List<SubmissionPageResponse.RoundDto> roundDtos = new ArrayList<>();
        com.fpt.shms.be.model.Contest contest = team.getContest();
        if (contest != null) {
            List<Round> rounds = roundRepository.findByContestId(contest.getId());
            rounds.sort(roundComparator());
            for (Round r : rounds) {
                Submission roundSubmission = submissions.stream()
                        .filter(s -> s.getRound() != null && s.getRound().getId().equals(r.getId()))
                        .max(java.util.Comparator.comparing(s -> s.getVersion() != null ? s.getVersion() : 1))
                        .orElse(null);
                ScoreSummary scoreSummary = getScoreSummary(roundSubmission);
                EligibilityResult eligibility = getRoundEligibility(team, r, rounds);

                String roundQualStatus = null;
                if (teamRankings != null) {
                    for (RankingResult rr : teamRankings) {
                        if (rr.getRound() != null && rr.getRound().getId().equals(r.getId())) {
                            roundQualStatus = rr.getQualificationStatus();
                            break;
                        }
                    }
                }

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
                        .submissionRequirements(r.getSubmissionRequirements())
                        .roundFormat(r.getRoundFormat())
                        .qualificationStatus(roundQualStatus)
                        .build());
            }
        }

        List<SubmissionPageResponse.HistoryDto> historyDtos = new ArrayList<>();
        for (Submission s : submissions) {
            if (s.getHistoryLog() != null && !s.getHistoryLog().isEmpty()) {
                String[] logs = s.getHistoryLog().split(";");
                for (String log : logs) {
                    if (log.isEmpty()) continue;
                    String[] parts = log.split("\\|");
                    if (parts.length >= 2) {
                        try {
                            String histStatus = parts.length >= 3 ? parts[2] : "ARCHIVED";
                            historyDtos.add(SubmissionPageResponse.HistoryDto.builder()
                                    .roundId(s.getRound() != null ? s.getRound().getId() : null)
                                    .version(Integer.parseInt(parts[0]))
                                    .timestamp(LocalDateTime.parse(parts[1]))
                                    .status(histStatus)
                                    .build());
                        } catch (Exception e) {}
                    }
                }
            }

            ScoreSummary scoreSummary = getScoreSummary(s);

            String mentorFeedback = s.getMentorFeedback();
            String mentorName = s.getMentor() != null ? s.getMentor().getFullName() : null;
            String judgeFeedback = null;
            if (s.getId() != null) {
                List<Score> scores = scoreRepository.findBySubmissionId(s.getId());

                List<Score> judgeScores = scores.stream()
                        .filter(sc -> !"MENTOR_FEEDBACK".equals(sc.getStatus()) && !"MISSED_DEADLINE".equals(sc.getStatus()) && sc.getGeneralFeedback() != null && !sc.getGeneralFeedback().isEmpty())
                        .toList();

                if (!judgeScores.isEmpty()) {
                    judgeFeedback = judgeScores.stream().map(Score::getGeneralFeedback).collect(Collectors.joining("\n\n"));
                }
            }

            historyDtos.add(SubmissionPageResponse.HistoryDto.builder()
                    .roundId(s.getRound() != null ? s.getRound().getId() : null)
                    .version(s.getVersion() != null ? s.getVersion() : 1)
                    .timestamp(s.getSubmittedAt())
                    .status(scoreSummary.evaluated ? "EVALUATED" : s.getStatus())
                    .submissionData(s.getSubmissionData())
                    .evaluated(scoreSummary.evaluated)
                    .totalScore(scoreSummary.totalScore)
                    .mentorFeedback(mentorFeedback)
                    .mentorName(mentorName)
                    .judgeFeedback(judgeFeedback)
                    .build());
        }

        historyDtos.sort((h1, h2) -> {
            Integer v1 = h1.getVersion() != null ? h1.getVersion() : 0;
            Integer v2 = h2.getVersion() != null ? h2.getVersion() : 0;
            return v2.compareTo(v1);
        });

        String qualificationStatus = null;
        if (teamRankings != null && !teamRankings.isEmpty()) {
            for (RankingResult rr : teamRankings) {
                if ("ELIMINATED".equalsIgnoreCase(rr.getQualificationStatus())) {
                    qualificationStatus = "ELIMINATED";
                    break;
                } else if (rr.getQualificationStatus() != null && !rr.getQualificationStatus().isEmpty()) {
                    qualificationStatus = rr.getQualificationStatus();
                }
            }
        }

        return SubmissionPageResponse.builder()
                .internalRole(membership.getRole())
                .contestName(contestName)
                .contestStatus(contestStatus)
                .qualificationStatus(qualificationStatus)
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

        if (!Round.RoundState.ACTIVED.equals(round.getState())) {
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

        if (round.getCategory() == null) {
            return new EligibilityResult(true, null);
        }
        Long categoryId = round.getCategory().getId();

        List<Round> categoryRounds = contestRounds.stream()
                .filter(r -> r.getCategory() != null && r.getCategory().getId().equals(categoryId))
                .sorted(roundComparator())
                .toList();

        int roundIndex = -1;
        for (int i = 0; i < categoryRounds.size(); i++) {
            if (categoryRounds.get(i).getId().equals(round.getId())) {
                roundIndex = i;
                break;
            }
        }

        if (roundIndex <= 0) {
            return new EligibilityResult(true, null);
        }

        Round previousRound = categoryRounds.get(roundIndex - 1);
        boolean qualified = rankingResultRepository.findQualifiedByRoundId(previousRound.getId())
                .stream()
                .filter(result -> result.getDatePublishedAt() != null)
                .anyMatch(result -> result.getTeam() != null && result.getTeam().getId().equals(team.getId()));

        if (qualified) {
            return new EligibilityResult(true, null);
        }

        String previousRoundName = previousRound.getPhaseName() != null ? previousRound.getPhaseName() : "the previous round";
        return new EligibilityResult(false, "Your team has been eliminated from " + previousRoundName + ".");
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
        List<Score> gradingScores = scores.stream()
                .filter(sc -> !"MENTOR_FEEDBACK".equals(sc.getStatus()))
                .toList();

        if (gradingScores.isEmpty()) {
            return new ScoreSummary(false, null);
        }

        double averageScore = gradingScores.stream()
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

    public com.fpt.shms.be.dto.TeamScoreDetailsResponse getTeamScoreDetails(String username, Long contestId) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        List<TeamMembership> memberships = teamMembershipRepository.findByUserId(user.getId());
        if (memberships.isEmpty()) {
            throw new IllegalArgumentException("User is not in any team");
        }

        Team team = null;
        if (contestId != null) {
            team = memberships.stream()
                    .map(TeamMembership::getTeam)
                    .filter(t -> t.getContest() != null && t.getContest().getId().equals(contestId))
                    .findFirst()
                    .orElse(null);
        }

        if (team == null) {
            team = memberships.get(0).getTeam();
        }

        String trackName = team.getContest() != null ? team.getContest().getName() : "N/A";
        Double overallTotalScore = 0.0;
        Integer overallRank = null;

        List<Submission> allSubmissions = submissionRepository.findByTeamId(team.getId());
        java.util.Map<Long, Submission> latestSubByRound = new java.util.HashMap<>();
        for (Submission s : allSubmissions) {
            if (s.getRound() == null) continue;
            Submission existing = latestSubByRound.get(s.getRound().getId());
            if (existing == null) {
                latestSubByRound.put(s.getRound().getId(), s);
            } else if (s.getVersion() != null && existing.getVersion() != null) {
                if (s.getVersion() > existing.getVersion()) {
                    latestSubByRound.put(s.getRound().getId(), s);
                } else if (s.getVersion().equals(existing.getVersion()) && s.getId() > existing.getId()) {
                    latestSubByRound.put(s.getRound().getId(), s);
                }
            }
        }
        List<Round> rounds = team.getContest() != null ? roundRepository.findByContestId(team.getContest().getId()) : new ArrayList<>();
        rounds.sort(java.util.Comparator.comparing(Round::getId));
        List<com.fpt.shms.be.dto.TeamScoreDetailsResponse.RoundScoreDto> roundScores = new ArrayList<>();

        for (Round r : rounds) {
            Submission sub = latestSubByRound.get(r.getId());

            java.time.LocalDateTime publishDateTime = r.getPublishResultAt();
            boolean isPublished = publishDateTime != null && !publishDateTime.isAfter(java.time.LocalDateTime.now());
            java.util.Date publishDate = publishDateTime != null ? java.util.Date.from(publishDateTime.atZone(java.time.ZoneId.systemDefault()).toInstant()) : null;

            Double avgRoundScore = null;
            boolean isGraded = false;
            boolean hasSubmission = false;
            String qualificationStatus = null;
            List<com.fpt.shms.be.dto.TeamScoreDetailsResponse.RubricScoreDto> detailedScores = new ArrayList<>();

            if (sub != null) {
                hasSubmission = !"MISSED_DEADLINE".equals(sub.getStatus());
                List<Score> scores = scoreRepository.findBySubmissionId(sub.getId());
                List<Score> judgeScores = scores.stream()
                        .filter(sc -> !"MENTOR_FEEDBACK".equals(sc.getStatus()))
                        .toList();

                boolean isAutoZero = "MISSED_DEADLINE".equals(sub.getStatus()) || judgeScores.stream().anyMatch(sc -> "MISSED_DEADLINE".equals(sc.getStatus()));
                List<Score> validJudgeScores = judgeScores.stream()
                        .filter(sc -> !"MISSED_DEADLINE".equals(sc.getStatus()))
                        .toList();

                isGraded = !validJudgeScores.isEmpty();

                if (isGraded) {
                    avgRoundScore = validJudgeScores.stream()
                            .map(Score::getTotalScore)
                            .filter(java.util.Objects::nonNull)
                            .mapToDouble(Double::doubleValue)
                            .average()
                            .orElse(0.0);
                } else if (isAutoZero) {
                    avgRoundScore = 0.0;
                    isGraded = true;
                }

                if (avgRoundScore != null) {
                    overallTotalScore += avgRoundScore;
                }

                List<ScoreDetail> allDetails = judgeScores.stream()
                        .flatMap(s -> s.getDetails() != null ? s.getDetails().stream() : java.util.stream.Stream.empty())
                        .toList();

                java.util.Map<Long, List<ScoreDetail>> groupedByRubric = allDetails.stream()
                        .filter(d -> d.getContestRubricDetail() != null)
                        .collect(Collectors.groupingBy(d -> d.getContestRubricDetail().getId()));

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

                if (detailedScores.isEmpty() && isAutoZero) {
                    if (r.getCategory() != null && contestRubricRepository != null && contestRubricDetailsRepository != null) {
                        List<com.fpt.shms.be.model.ContestRubric> rubrics = contestRubricRepository.findByCategoryId(r.getCategory().getId());
                        if (!rubrics.isEmpty()) {
                            List<com.fpt.shms.be.model.ContestRubricDetails> details = contestRubricDetailsRepository.findByContestRubricId(rubrics.get(0).getId());
                            for (com.fpt.shms.be.model.ContestRubricDetails d : details) {
                                detailedScores.add(com.fpt.shms.be.dto.TeamScoreDetailsResponse.RubricScoreDto.builder()
                                        .criteriaName(d.getCriteriaName())
                                        .weight(d.getPercentageWeight())
                                        .pointsAwarded(0.0)
                                        .feedback("- Missed Deadline")
                                        .build());
                            }
                        }
                    }
                }
            } else {
                if (isPublished) {
                    avgRoundScore = 0.0;
                    isGraded = true;
                    if (r.getCategory() != null && contestRubricRepository != null && contestRubricDetailsRepository != null) {
                        List<com.fpt.shms.be.model.ContestRubric> rubrics = contestRubricRepository.findByCategoryId(r.getCategory().getId());
                        if (!rubrics.isEmpty()) {
                            List<com.fpt.shms.be.model.ContestRubricDetails> details = contestRubricDetailsRepository.findByContestRubricId(rubrics.get(0).getId());
                            for (com.fpt.shms.be.model.ContestRubricDetails d : details) {
                                detailedScores.add(com.fpt.shms.be.dto.TeamScoreDetailsResponse.RubricScoreDto.builder()
                                        .criteriaName(d.getCriteriaName())
                                        .weight(d.getPercentageWeight())
                                        .pointsAwarded(0.0)
                                        .feedback("- No Submission")
                                        .build());
                            }
                        }
                    }
                }
            }

            if (rankingResultRepository != null) {
                java.util.List<com.fpt.shms.be.model.RankingResult> teamRankings = rankingResultRepository.findByTeamId(team.getId());
                for (com.fpt.shms.be.model.RankingResult rr : teamRankings) {
                    if (rr.getRound() != null && rr.getRound().getId().equals(r.getId())) {
                        qualificationStatus = rr.getQualificationStatus();
                        break;
                    }
                }
            }

            roundScores.add(com.fpt.shms.be.dto.TeamScoreDetailsResponse.RoundScoreDto.builder()
                    .roundId(r.getId())
                    .roundName(r.getPhaseName())
                    .totalScore(isPublished && avgRoundScore != null ? Math.round(avgRoundScore * 100.0) / 100.0 : null)
                    .hasSubmission(hasSubmission)
                    .isGraded(isGraded)
                    .resultPublished(publishDate != null)
                    .publishResultAt(publishDate)
                    .qualificationStatus(qualificationStatus)
                    .detailedScores(isPublished ? detailedScores : new ArrayList<>())
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
