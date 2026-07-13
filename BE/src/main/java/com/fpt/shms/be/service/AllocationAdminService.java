package com.fpt.shms.be.service;

import com.fpt.shms.be.dto.ExpertAllocationRequest;
import com.fpt.shms.be.model.*;
import com.fpt.shms.be.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class AllocationAdminService {

    private final JudgeAssignmentRepository judgeAssignmentRepository;
    private final MentorAssignmentRepository mentorAssignmentRepository;
    private final UserRepository userRepository;
    private final CategoryRepository categoryRepository;
    private final TeamRepository teamRepository;
    private final MentorRepository mentorRepository;
    private final JudgeRepository judgeRepository;
    private final TeamMentorRepository teamMentorRepository;
    private final RoundRepository roundRepository;
    private final RankingResultRepository rankingResultRepository;
    private final AuditLogService auditLogService;
    private final EmailService emailService;

    @Transactional
    public void allocateExpert(ExpertAllocationRequest request) {
        User user = userRepository.findById(request.getUserId())
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        Round round = roundRepository.findById(request.getRoundId())
                .orElseThrow(() -> new IllegalArgumentException("Round not found"));

        Category targetCategory = round.getCategory();
        if (targetCategory == null) {
            throw new IllegalArgumentException("Round is not associated with any category");
        }
        Long categoryId = targetCategory.getId();

        // Validate: không vừa là Judge vừa là Mentor trong cùng Category
        for (ExpertAllocationRequest.TrackAssignment assignment : request.getAssignments()) {
            boolean isMentor = assignment.getMentoredTeamIds() != null && !assignment.getMentoredTeamIds().isEmpty();
            if (isMentor && Boolean.TRUE.equals(assignment.getIsJudge())) {
                throw new IllegalArgumentException(
                        "Users cannot be assigned as both a Mentor and a Judge in the same Category");
            }
        }

        // Xóa phân bổ cũ cho user này tại category này
        judgeAssignmentRepository.deleteByUserIdAndCategoryId(user.getId(), categoryId);
        mentorAssignmentRepository.deleteByUserIdAndCategoryId(user.getId(), categoryId);
        teamMentorRepository.deleteByMentorIdAndCategoryId(user.getId(), categoryId);

        // Lưu phân bổ mới
        for (ExpertAllocationRequest.TrackAssignment assignment : request.getAssignments()) {
            boolean isMentor = assignment.getMentoredTeamIds() != null && !assignment.getMentoredTeamIds().isEmpty();
            if (!isMentor && !Boolean.TRUE.equals(assignment.getIsJudge())) {
                continue;
            }

            Category category = categoryRepository.findById(assignment.getTrackId())
                    .orElseThrow(() -> new IllegalArgumentException("Category not found: " + assignment.getTrackId()));

            if (isMentor) {
                Mentor mentor = mentorRepository.findById(user.getId())
                        .orElseThrow(() -> new IllegalArgumentException("Mentor profile not found"));

                MentorAssignment mentorAssignment = MentorAssignment.builder()
                        .mentor(mentor)
                        .category(category)
                        .build();
                mentorAssignmentRepository.save(mentorAssignment);

                for (Long teamId : assignment.getMentoredTeamIds()) {
                    Team team = teamRepository.findById(teamId)
                            .orElseThrow(() -> new IllegalArgumentException("Team not found: " + teamId));

                    TeamMentor teamMentor = TeamMentor.builder()
                            .team(team)
                            .mentor(mentor)
                            .category(category)
                            .build();
                    teamMentorRepository.save(teamMentor);
                }
            }

            if (Boolean.TRUE.equals(assignment.getIsJudge())) {
                Judge judge = judgeRepository.findById(user.getId())
                        .orElseThrow(() -> new IllegalArgumentException("Judge profile not found"));

                JudgeAssignment judgeAssignment = JudgeAssignment.builder()
                        .judge(judge)
                        .category(category)
                        .build();
                judgeAssignmentRepository.save(judgeAssignment);
            }
        }
        auditLogService.log("ALLOCATE_EXPERT", "User", user.getUsername(), "UNALLOCATED", "ALLOCATED", "Assigned expert to track/team");
    }

    @Transactional(readOnly = true)
    public Map<Long, Map<Long, Map<String, Object>>> getAllocationsByRound(Long roundId) {
        Map<Long, Map<Long, Map<String, Object>>> allocations = new HashMap<>();

        Round round = roundRepository.findById(roundId)
                .orElseThrow(() -> new IllegalArgumentException("Round not found"));

        Category targetCategory = round.getCategory();
        if (targetCategory == null) {
            return allocations;
        }
        Long categoryId = targetCategory.getId();

        List<TeamMentor> allTeamMentors = teamMentorRepository.findByCategoryId(categoryId);
        for (TeamMentor tm : allTeamMentors) {
            Long expertId = tm.getMentor().getId();
            Long teamId = tm.getTeam().getId();
            Long trackId = tm.getCategory().getId();

            allocations.putIfAbsent(expertId, new HashMap<>());
            allocations.get(expertId).putIfAbsent(trackId, new HashMap<>());

            Map<String, Object> trackAlloc = allocations.get(expertId).get(trackId);
            @SuppressWarnings("unchecked")
            List<Long> teams = (List<Long>) trackAlloc.getOrDefault("mentoredTeamIds", new ArrayList<Long>());
            if (!teams.contains(teamId)) {
                teams.add(teamId);
            }
            trackAlloc.put("mentoredTeamIds", teams);
        }

        List<JudgeAssignment> judgeAssignments = judgeAssignmentRepository.findByCategoryId(categoryId);
        for (JudgeAssignment ja : judgeAssignments) {
            Long expertId = ja.getUser().getId();
            Long trackId = ja.getCategory().getId();

            allocations.putIfAbsent(expertId, new HashMap<>());
            allocations.get(expertId).putIfAbsent(trackId, new HashMap<>());
            allocations.get(expertId).get(trackId).put("isJudge", true);
        }

        return allocations;
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> getEligibleTeamsForRound(Long roundId) {
        Round round = roundRepository.findById(roundId)
                .orElseThrow(() -> new IllegalArgumentException("Round not found"));

        Long categoryId = round.getCategory() != null ? round.getCategory().getId() : null;
        Long contestId = round.getContest() != null ? round.getContest().getId() : null;

        List<Map<String, Object>> result = new ArrayList<>();

        if (categoryId == null || contestId == null) {
            return result;
        }

        List<Round> categoryRounds = roundRepository.findByContestIdOrderBySubmissionOpenAsc(contestId).stream()
                .filter(r -> r.getCategory() != null && r.getCategory().getId().equals(categoryId))
                .sorted(java.util.Comparator.comparing(Round::getSubmissionOpen))
                .toList();

        int idx = -1;
        for (int i = 0; i < categoryRounds.size(); i++) {
            if (categoryRounds.get(i).getId().equals(round.getId())) {
                idx = i;
                break;
            }
        }

        if (idx <= 0) {
            List<Team> approvedTeams = teamRepository.findByContestId(contestId)
                    .stream()
                    .filter(t -> "APPROVED".equals(t.getStatus()))
                    .toList();

            for (Team team : approvedTeams) {
                Map<String, Object> tm = new HashMap<>();
                tm.put("id", team.getId());
                tm.put("name", team.getName());
                tm.put("status", team.getStatus());
                result.add(tm);
            }
        } else {
            Round previousRound = categoryRounds.get(idx - 1);
            List<RankingResult> qualifiedResults = rankingResultRepository.findQualifiedByRoundId(previousRound.getId()).stream()
                    .filter(rr -> rr.getDatePublishedAt() != null)
                    .toList();

            for (RankingResult rr : qualifiedResults) {
                Team team = rr.getTeam();
                Map<String, Object> tm = new HashMap<>();
                tm.put("id", team.getId());
                tm.put("name", team.getName());
                tm.put("status", "QUALIFIED");
                tm.put("previousRoundId", previousRound.getId());
                result.add(tm);
            }
        }

        return result;
    }

    public Map<Long, Map<Long, Map<String, Object>>> getAllAllocations() {
        Map<Long, Map<Long, Map<String, Object>>> allocations = new HashMap<>();

        List<TeamMentor> allTeamMentors = teamMentorRepository.findAll();

        for (TeamMentor tm : allTeamMentors) {
            Long expertId = tm.getMentor().getId();
            Long teamId = tm.getTeam().getId();
            Long trackId = tm.getCategory().getId();

            allocations.putIfAbsent(expertId, new HashMap<>());
            allocations.get(expertId).putIfAbsent(trackId, new HashMap<>());

            Map<String, Object> trackAlloc = allocations.get(expertId).get(trackId);
            @SuppressWarnings("unchecked")
            List<Long> teams = (List<Long>) trackAlloc.getOrDefault("mentoredTeamIds", new java.util.ArrayList<Long>());
            if (!teams.contains(teamId)) {
                teams.add(teamId);
            }
            trackAlloc.put("mentoredTeamIds", teams);
        }

        List<JudgeAssignment> judgeAssignments = judgeAssignmentRepository.findAll();
        for (JudgeAssignment ja : judgeAssignments) {
            Long expertId = ja.getUser().getId();
            Long trackId = ja.getCategory().getId();

            allocations.putIfAbsent(expertId, new HashMap<>());
            allocations.get(expertId).putIfAbsent(trackId, new HashMap<>());
            allocations.get(expertId).get(trackId).put("isJudge", true);
        }

        return allocations;
    }

    public void notifyAllocatedExperts(Long roundId) {
        Round round = roundRepository.findById(roundId)
                .orElseThrow(() -> new IllegalArgumentException("Round not found"));

        Category targetCategory = round.getCategory();
        if (targetCategory == null) {
            throw new IllegalArgumentException("Round is not associated with any category");
        }

        String roundName = round.getPhaseName();
        String trackName = targetCategory.getName();

        Map<Long, Map<Long, Map<String, Object>>> allocations = getAllocationsByRound(roundId);

        for (Map.Entry<Long, Map<Long, Map<String, Object>>> expertEntry : allocations.entrySet()) {
            Long expertId = expertEntry.getKey();
            Map<Long, Map<String, Object>> trackAllocations = expertEntry.getValue();

            Map<String, Object> currentTrackAlloc = trackAllocations.get(targetCategory.getId());
            if (currentTrackAlloc == null) continue;

            User expert = userRepository.findById(expertId).orElse(null);
            if (expert == null || expert.getEmail() == null) continue;

            boolean isJudge = Boolean.TRUE.equals(currentTrackAlloc.get("isJudge"));
            @SuppressWarnings("unchecked")
            List<Long> mentoredTeamIds = (List<Long>) currentTrackAlloc.get("mentoredTeamIds");

            List<String> mentoredTeamNames = new ArrayList<>();
            if (mentoredTeamIds != null && !mentoredTeamIds.isEmpty()) {
                List<Team> teams = teamRepository.findAllById(mentoredTeamIds);
                for (Team t : teams) {
                    mentoredTeamNames.add(t.getName());
                }
            }

            if (isJudge || !mentoredTeamNames.isEmpty()) {
                emailService.sendExpertAllocationEmailAsync(
                        expert.getEmail(),
                        expert.getFullName(),
                        roundName,
                        trackName,
                        mentoredTeamNames,
                        isJudge
                );
            }
        }
    }
}