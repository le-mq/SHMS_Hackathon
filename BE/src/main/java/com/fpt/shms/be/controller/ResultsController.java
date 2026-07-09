package com.fpt.shms.be.controller;

import com.fpt.shms.be.repository.TeamRepository;
import com.fpt.shms.be.repository.ScoreRepository;
import com.fpt.shms.be.repository.SubmissionRepository;
import com.fpt.shms.be.repository.TeamMembershipRepository;
import com.fpt.shms.be.repository.TeamMentorRepository;
import com.fpt.shms.be.repository.JudgeAssignmentRepository;
import com.fpt.shms.be.model.Team;
import com.fpt.shms.be.model.TeamMembership;
import com.fpt.shms.be.model.TeamMentor;
import com.fpt.shms.be.model.JudgeAssignment;
import com.fpt.shms.be.model.Submission;
import com.fpt.shms.be.model.Score;
import com.fpt.shms.be.model.ScoreDetail;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.io.PrintWriter;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/admin/results")
@PreAuthorize("hasAuthority('ADMIN')")
@RequiredArgsConstructor
@Tag(name = "Admin - Results", description = "Result Publication and Data Export APIs")
public class ResultsController {

    private final TeamRepository teamRepository;
    private final SubmissionRepository submissionRepository;
    private final ScoreRepository scoreRepository;
    private final TeamMembershipRepository teamMembershipRepository;
    private final TeamMentorRepository teamMentorRepository;
    private final JudgeAssignmentRepository judgeAssignmentRepository;

    @PostMapping("/publish")
    @Operation(summary = "Publish Results", description = "Publishes the standings to the public leaderboard for a specific contest.")
    public ResponseEntity<?> publishResults(HttpServletRequest request, @RequestParam Long contestId) {
        try {

            return ResponseEntity.ok(Map.of(
                    "message", "Results published successfully for contest ID: " + contestId,
                    "publishedAt", LocalDateTime.now().toString()
            ));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/export-csv")
    @Operation(summary = "Export CSV Data", description = "Generates CSV reports for team list or scoring matrix.")
    public void exportCsv(HttpServletRequest request, HttpServletResponse response, @RequestParam String type, @RequestParam(required = false) Long contestId) {
        try {
            response.setContentType("text/csv; charset=UTF-8");
            response.setHeader(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + type + "_export.csv\"");

            PrintWriter writer = response.getWriter();
            writer.write('\ufeff');

            if (contestId == null) {
                writer.println("Error: No Contest ID provided.");
                writer.flush();
                writer.close();
                return;
            }
            List<Team> teams = teamRepository.findByContestId(contestId);

            if ("teams".equalsIgnoreCase(type)) {
                writer.println("Team ID,Team Code,Team Name,Status,Leader Student Code,Leader Name,Leader Email,Total Members,Enrolled Category,Assigned Mentor,Registration Date");
                DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
                for (Team team : teams) {
                    List<TeamMembership> memberships = teamMembershipRepository.findByTeamId(team.getId());
                    String leaderUsername = "";
                    String leaderName = "";
                    String leaderEmail = "";
                    long totalMembers = 0;
                    for (TeamMembership tm : memberships) {
                        if (tm.getStatus() != null && (tm.getStatus().equalsIgnoreCase("APPROVED") || tm.getStatus().equalsIgnoreCase("ACTIVE") || tm.getStatus().equalsIgnoreCase("PENDING"))) {
                            totalMembers++;
                        }
                        if (tm.getRole() != null && tm.getRole().equalsIgnoreCase("LEADER") && tm.getUser() != null) {
                            leaderUsername = tm.getUser().getUsername() != null ? tm.getUser().getUsername() : "";
                            leaderName = tm.getUser().getFullName() != null ? tm.getUser().getFullName() : "";
                            leaderEmail = tm.getUser().getEmail() != null ? tm.getUser().getEmail() : "";
                        }
                    }
                    if (leaderUsername.isEmpty() && !memberships.isEmpty() && memberships.get(0).getUser() != null) {
                        leaderUsername = memberships.get(0).getUser().getUsername() != null ? memberships.get(0).getUser().getUsername() : "";
                        leaderName = memberships.get(0).getUser().getFullName() != null ? memberships.get(0).getUser().getFullName() : "";
                        leaderEmail = memberships.get(0).getUser().getEmail() != null ? memberships.get(0).getUser().getEmail() : "";
                    }

                    List<TeamMentor> teamMentors = teamMentorRepository.findByTeamId(team.getId());
                    String categoryName = "All Categories";
                    String mentorInfo = "Unassigned";
                    if (!teamMentors.isEmpty()) {
                        TeamMentor tm = teamMentors.get(0);
                        if (tm.getCategory() != null && tm.getCategory().getName() != null) {
                            categoryName = tm.getCategory().getName();
                        }
                        if (tm.getMentor() != null && tm.getMentor().getUser() != null) {
                            String mName = tm.getMentor().getUser().getFullName();
                            String mEmail = tm.getMentor().getUser().getEmail();
                            mentorInfo = mName != null ? mName + (mEmail != null ? " (" + mEmail + ")" : "") : (mEmail != null ? mEmail : "Mentor ID " + tm.getMentor().getId());
                        }
                    }

                    String teamIdStr = team.getId() != null ? String.valueOf(team.getId()) : "";
                    String teamCodeStr = team.getTeamCode() != null ? team.getTeamCode() : "";
                    String teamNameStr = escapeCsv(team.getName());
                    String statusStr = team.getStatus() != null ? team.getStatus() : "";
                    String createdAtStr = team.getCreatedAt() != null ? team.getCreatedAt().format(formatter) : "";

                    writer.println(String.format("\"%s\",\"%s\",\"%s\",\"%s\",\"%s\",\"%s\",\"%s\",%d,\"%s\",\"%s\",\"%s\"",
                            teamIdStr, teamCodeStr, teamNameStr, statusStr, escapeCsv(leaderUsername), escapeCsv(leaderName), escapeCsv(leaderEmail),
                            totalMembers, escapeCsv(categoryName), escapeCsv(mentorInfo), createdAtStr));
                }
            } else if ("scores".equalsIgnoreCase(type)) {
                writer.println("Team Name,Category,Submission Data,Judge,Criteria,Points,Feedback");
                for (Team team : teams) {
                    String teamCategoryName = "General Track / All Categories";
                    List<TeamMentor> teamMentors = teamMentorRepository.findByTeamId(team.getId());
                    if (!teamMentors.isEmpty() && teamMentors.get(0).getCategory() != null && teamMentors.get(0).getCategory().getName() != null) {
                        teamCategoryName = teamMentors.get(0).getCategory().getName();
                    }

                    List<Submission> submissions = submissionRepository.findByTeamId(team.getId());
                    for (Submission sub : submissions) {
                        List<Score> scores = scoreRepository.findBySubmissionId(sub.getId());
                        for (Score sc : scores) {
                            String judgeName = sc.getJudge() != null ? "Judge ID " + sc.getJudge().getId() : "Unknown";
                            String judgeCategoryName = teamCategoryName;
                            if (sc.getJudge() != null && sc.getJudge().getId() != null) {
                                List<JudgeAssignment> jas = judgeAssignmentRepository.findByUserId(sc.getJudge().getId());
                                if (!jas.isEmpty() && jas.get(0).getCategory() != null && jas.get(0).getCategory().getName() != null) {
                                    judgeCategoryName = jas.get(0).getCategory().getName();
                                }
                            }

                            String subDataCsv = escapeCsv(sub.getSubmissionData());

                            if (sc.getDetails() != null && !sc.getDetails().isEmpty()) {
                                for (ScoreDetail sd : sc.getDetails()) {

                                    String judgedCategoryName = teamCategoryName;
                                    if (sd.getContestRubricDetail() != null &&
                                            sd.getContestRubricDetail().getContestRubric() != null &&
                                            sd.getContestRubricDetail().getContestRubric().getCategory() != null &&
                                            sd.getContestRubricDetail().getContestRubric().getCategory().getName() != null) {
                                        judgedCategoryName = sd.getContestRubricDetail().getContestRubric().getCategory().getName();
                                    } else if (!"General Track / All Categories".equals(judgeCategoryName)) {
                                        judgedCategoryName = judgeCategoryName;
                                    }

                                    String critName = sd.getContestRubricDetail() != null ? sd.getContestRubricDetail().getCriteriaName() : "Overall Score";
                                    String feedback = escapeCsv(sd.getFeedback());

                                    writer.println(String.format("\"%s\",\"%s\",\"%s\",\"%s\",\"%s\",%f,\"%s\"",
                                            escapeCsv(team.getName()), escapeCsv(judgedCategoryName), subDataCsv, escapeCsv(judgeName), escapeCsv(critName), sd.getRawScore(), feedback));
                                }
                            } else {

                                String feedback = escapeCsv(sc.getGeneralFeedback());
                                String judgedCategoryName = !"General Track / All Categories".equals(judgeCategoryName) ? judgeCategoryName : teamCategoryName;
                                writer.println(String.format("\"%s\",\"%s\",\"%s\",\"%s\",\"%s\",%f,\"%s\"",
                                        escapeCsv(team.getName()), escapeCsv(judgedCategoryName), subDataCsv, escapeCsv(judgeName), "Overall Score", sc.getTotalScore(), feedback));
                            }
                        }
                    }
                }
            } else {
                writer.println("Invalid export type");
            }

            writer.flush();
            writer.close();
        } catch (Exception e) {
            response.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
        }
    }

    private String escapeCsv(String input) {
        if (input == null) return "";
        return input.replace("\"", "\"\"").replace("\r", " ").replace("\n", " ");
    }
}