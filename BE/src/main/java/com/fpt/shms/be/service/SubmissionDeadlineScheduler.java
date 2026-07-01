package com.fpt.shms.be.service;

import com.fpt.shms.be.model.*;
import com.fpt.shms.be.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Scheduler tự động chấm 0 điểm cho các đội không nộp bài OFFICIAL khi quá deadline.
 * Chạy mỗi phút kiểm tra Round đã hết deadline.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class SubmissionDeadlineScheduler {

    private final RoundRepository roundRepository;
    private final TeamRepository teamRepository;
    private final SubmissionRepository submissionRepository;
    private final ScoreRepository scoreRepository;
    private final UserRepository userRepository;

    @Scheduled(fixedRate = 60000) // Chạy mỗi 60 giây
    @Transactional
    public void autoZeroMissedDeadlines() {
        try {
            LocalDateTime now = LocalDateTime.now();
            List<Round> expiredRounds = roundRepository.findBySubmissionDeadlineBefore(now);

            for (Round round : expiredRounds) {
                if (round.getContest() == null) continue;

                List<Team> approvedTeams = teamRepository.findByContestId(round.getContest().getId())
                        .stream()
                        .filter(t -> "APPROVED".equals(t.getStatus()))
                        .toList();

                // Lấy danh sách team đã có submission OFFICIAL cho round này
                List<Submission> roundSubmissions = submissionRepository.findByRoundId(round.getId());
                Set<Long> teamsWithOfficialSubmission = roundSubmissions.stream()
                        .filter(s -> "OFFICIAL".equals(s.getStatus()) || "SUBMITTED".equals(s.getStatus()))
                        .map(s -> s.getTeam().getId())
                        .collect(Collectors.toSet());

                for (Team team : approvedTeams) {
                    if (teamsWithOfficialSubmission.contains(team.getId())) continue;

                    // Kiểm tra xem đã có bản ghi AUTO_ZERO chưa
                    boolean alreadyAutoZero = roundSubmissions.stream()
                            .anyMatch(s -> s.getTeam().getId().equals(team.getId()) && "AUTO_ZERO".equals(s.getStatus()));
                    if (alreadyAutoZero) continue;

                    // Tạo submission placeholder
                    Submission autoSubmission = Submission.builder()
                            .team(team)
                            .round(round)
                            .version(0)
                            .historyLog("")
                            .submittedAt(now)
                            .status("AUTO_ZERO")
                            .build();
                    autoSubmission = submissionRepository.save(autoSubmission);

                    User systemUser = userRepository.findAll().stream().findFirst().orElse(null);

                    Score zeroScore = Score.builder()
                            .submission(autoSubmission)
                            .judge(systemUser)
                            .totalScore(0.0)
                            .generalFeedback("Automatic zero score - Team did not submit an official submission before the deadline.")
                            .status("AUTO_ZERO")
                            .details(new ArrayList<>())
                            .build();
                    scoreRepository.save(zeroScore);

                    log.info("AUTO_ZERO: Team '{}' (ID: {}) scored 0 for Round '{}' (ID: {})",
                            team.getName(), team.getId(), round.getPhaseName(), round.getId());
                }
            }
        } catch (Exception e) {
            log.error("Error in SubmissionDeadlineScheduler: {}", e.getMessage(), e);
        }
    }
}
