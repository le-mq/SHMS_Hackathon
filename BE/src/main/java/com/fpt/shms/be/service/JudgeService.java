//JudgeService
package com.fpt.shms.be.service;

import com.fpt.shms.be.dto.EvaluatorDashboardResponse;
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

        List<Long> categoryIds = categories.stream().map(Category::getId).toList();

        List<Team> assignedTeams = categoryIds.isEmpty() ? new ArrayList<>() : teamRepository.findByCategoryIdIn(categoryIds);

        List<Long> teamIds = assignedTeams.stream().map(Team::getId).toList();
        List<Submission> submissions = teamIds.isEmpty() ? new ArrayList<>() : submissionRepository.findByTeamIdIn(teamIds);

        // Keep latest submission for each team
        Map<Long, Submission> latestSubmissions = submissions.stream()
                .collect(Collectors.toMap(
                        sub -> sub.getTeam().getId(),
                        sub -> sub,
                        (s1, s2) -> s1.getVersion() > s2.getVersion() ? s1 : s2
                ));

        int evaluatedCount = 0;

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

            String submissionState = isEvaluated ? "Evaluated" : (latestSub != null ? latestSub.getStatus() : "Pending");
            String roundName = "Latest Round"; // Could query rounds

            String abbreviation = team.getName() != null && team.getName().length() >= 2
                    ? team.getName().substring(0, 2).toUpperCase()
                    : "TM";

            queue.add(EvaluatorDashboardResponse.AssignedTeamQueueDto.builder()
                    .teamId(team.getId())
                    .teamName(team.getName())
                    .abbreviation(abbreviation)
                    .trackName(team.getCategory() != null ? team.getCategory().getName() : "Unknown Track")
                    .roundName(roundName)
                    .submissionState(submissionState)
                    .themeClass("ai") // Hardcoded theme class for now
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
}
