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
import java.util.List;

@Service
@RequiredArgsConstructor
public class SubmissionService {

    private final SubmissionRepository submissionRepository;
    private final TeamMembershipRepository teamMembershipRepository;
    private final UserRepository userRepository;
    private final RoundRepository roundRepository;
    private final ScoreRepository scoreRepository;

    @Transactional
    public void submitProject(SubmitProjectRequest request, String username) {
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
        com.fpt.shms.be.model.Contest contest = team.getContest() != null ? team.getContest()
                : (team.getCategory() != null ? team.getCategory().getContest() : null);
        if (contest != null) {
            List<Round> rounds = roundRepository.findByContestId(contest.getId());
            for (Round r : rounds) {
                roundDtos.add(SubmissionPageResponse.RoundDto.builder()
                        .id(r.getId())
                        .name(r.getPhaseName())
                        .status(r.getState().name())
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
            historyDtos.add(SubmissionPageResponse.HistoryDto.builder()
                    .roundId(s.getRound() != null ? s.getRound().getId() : null)
                    .version(s.getVersion() != null ? s.getVersion() : 1)
                    .timestamp(s.getSubmittedAt())
                    .status(s.getStatus())
                    .githubRepoUrl(s.getProjectRepositoryUrl())
                    .liveDemoUrl(s.getDemoVideoUrl())
                    .docsUrl(s.getDocumentationUrl())
                    .slideUrl(s.getPresentationSlideUrl())
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
}
