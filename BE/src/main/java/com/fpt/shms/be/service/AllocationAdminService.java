package com.fpt.shms.be.service;

import com.fpt.shms.be.dto.ExpertAllocationRequest;
import com.fpt.shms.be.model.Category;
import com.fpt.shms.be.model.JudgeAssignment;
import com.fpt.shms.be.model.MentorAssignment;
import com.fpt.shms.be.model.User;
import com.fpt.shms.be.repository.CategoryRepository;
import com.fpt.shms.be.repository.JudgeAssignmentRepository;
import com.fpt.shms.be.repository.MentorAssignmentRepository;
import com.fpt.shms.be.repository.UserRepository;
import com.fpt.shms.be.repository.TeamRepository;
import com.fpt.shms.be.repository.MentorRepository;
import com.fpt.shms.be.repository.JudgeRepository;
import com.fpt.shms.be.model.Team;
import com.fpt.shms.be.model.Mentor;
import com.fpt.shms.be.model.Judge;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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

    @Transactional
    public void allocateExpert(ExpertAllocationRequest request) {
        User user = userRepository.findById(request.getUserId())
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        // BR-ASG-01: A user cannot be assigned as both Mentor and Judge in the same track
        for (ExpertAllocationRequest.TrackAssignment assignment : request.getAssignments()) {
            boolean isMentor = assignment.getMentoredTeamIds() != null && !assignment.getMentoredTeamIds().isEmpty();
            if (isMentor && Boolean.TRUE.equals(assignment.getIsJudge())) {
                throw new IllegalArgumentException("Users cannot be assigned as both a Mentor and a Judge within the exact same track");
            }
        }

        // Clean up previous allocations for this user to perform a clean sync
        judgeAssignmentRepository.deleteByUserId(user.getId());
        mentorAssignmentRepository.deleteByUserId(user.getId());
        
        // Remove mentor from previously mentored teams
        List<Team> previousTeams = teamRepository.findByMentorId(user.getId());
        for (Team t : previousTeams) {
            t.setMentor(null);
            teamRepository.save(t);
        }

        // Save new allocations
        for (ExpertAllocationRequest.TrackAssignment assignment : request.getAssignments()) {
            boolean isMentor = assignment.getMentoredTeamIds() != null && !assignment.getMentoredTeamIds().isEmpty();
            if (!isMentor && Boolean.FALSE.equals(assignment.getIsJudge())) {
                continue;
            }

            Category category = categoryRepository.findById(assignment.getTrackId())
                    .orElseThrow(() -> new IllegalArgumentException("Category not found"));

            if (isMentor) {
                Mentor mentor = mentorRepository.findById(user.getId())
                        .orElseThrow(() -> new IllegalArgumentException("Mentor profile not found"));
                // Ensure the mentor is assigned to the category
                MentorAssignment mentorAssignment = MentorAssignment.builder()
                        .mentor(mentor)
                        .category(category)
                        .build();
                mentorAssignmentRepository.save(mentorAssignment);

                for (Long teamId : assignment.getMentoredTeamIds()) {
                    Team team = teamRepository.findById(teamId)
                            .orElseThrow(() -> new IllegalArgumentException("Team not found"));
                    
                    team.setMentor(mentor);
                    teamRepository.save(team);
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
    }

    public Map<Long, Map<Long, Map<String, Object>>> getAllAllocations() {
        Map<Long, Map<Long, Map<String, Object>>> allocations = new HashMap<>();

        // Fetch all teams that have a mentor to populate mentoredTeamIds
        List<Team> allTeams = teamRepository.findAll();
        for (Team team : allTeams) {
            if (team.getMentor() != null) {
                Long expertId = team.getMentor().getId();
                Long trackId = team.getCategory().getId();
                Long teamId = team.getId();

                allocations.putIfAbsent(expertId, new HashMap<>());
                allocations.get(expertId).putIfAbsent(trackId, new HashMap<>());
                
                Map<String, Object> trackAlloc = allocations.get(expertId).get(trackId);
                List<Long> teams = (List<Long>) trackAlloc.getOrDefault("mentoredTeamIds", new java.util.ArrayList<Long>());
                if (!teams.contains(teamId)) {
                    teams.add(teamId);
                }
                trackAlloc.put("mentoredTeamIds", teams);
            }
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
}
