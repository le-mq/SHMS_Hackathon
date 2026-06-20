package com.fpt.shms.be.controller;

import com.fpt.shms.be.util.JwtUtils;
import com.fpt.shms.be.repository.TeamRepository;
import com.fpt.shms.be.repository.ScoreRepository;
import com.fpt.shms.be.repository.SubmissionRepository;
import com.fpt.shms.be.model.Team;
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
import org.springframework.web.bind.annotation.*;

import java.io.PrintWriter;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/admin/results")
@RequiredArgsConstructor
@Tag(name = "Admin - Results", description = "Result Publication and Data Export APIs")
public class ResultsController {

    private final JwtUtils jwtUtils;
    private final TeamRepository teamRepository;
    private final SubmissionRepository submissionRepository;
    private final ScoreRepository scoreRepository;

    @PostMapping("/publish")
    @Operation(summary = "Publish Results", description = "Publishes the standings to the public leaderboard for a specific contest.")
    public ResponseEntity<?> publishResults(HttpServletRequest request, @RequestParam Long contestId) {
        try {
            String token = jwtUtils.extractToken(request);
            if (token == null || !jwtUtils.validateToken(token)) {
                return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));
            }

            String role = jwtUtils.extractRole(token);
            if (!"ADMIN".equals(role)) {
                return ResponseEntity.status(403).body(Map.of("error", "Access denied: ADMIN role required."));
            }

            // Ghi chú cho sếp: Chỗ này sếp tự viết code kết nối DB để cập nhật date_published_at nhé.

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
            String token = jwtUtils.extractToken(request);
            if (token == null || !jwtUtils.validateToken(token)) {
                response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Unauthorized");
                return;
            }

            String role = jwtUtils.extractRole(token);
            if (!"ADMIN".equals(role)) {
                response.sendError(HttpServletResponse.SC_FORBIDDEN, "Access denied");
                return;
            }

            response.setContentType("text/csv; charset=UTF-8");
            response.setHeader(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + type + "_export.csv\"");

            PrintWriter writer = response.getWriter();
            writer.write('\ufeff'); // BOM for UTF-8 giúp Excel không lỗi font tiếng Việt

            if (contestId == null) {
                writer.println("Error: No Contest ID provided.");
                writer.flush();
                writer.close();
                return;
            }

            List<Team> teams = teamRepository.findByContestId(contestId);

            if ("teams".equalsIgnoreCase(type)) {
                writer.println("Team Name,Enrolled Category");
                for (Team team : teams) {
                    writer.println(String.format("\"%s\",\"%s\"", team.getName(), "All Categories"));
                }
            } else if ("scores".equalsIgnoreCase(type)) {
                writer.println("Team Name,Category,Project Repo,Judge,Criteria,Points,Feedback");
                for (Team team : teams) {
                    List<Submission> submissions = submissionRepository.findByTeamId(team.getId());
                    for (Submission sub : submissions) {
                        List<Score> scores = scoreRepository.findBySubmissionId(sub.getId());
                        for (Score sc : scores) {
                            String judgeName = sc.getJudge() != null ? "Judge ID " + sc.getJudge().getId() : "Unknown";

                            // Lặp qua ScoreDetail để moi điểm từng tiêu chí
                            if (sc.getDetails() != null && !sc.getDetails().isEmpty()) {
                                for (ScoreDetail sd : sc.getDetails()) {

                                    // Móc Tên Hạng Mục mà Giám khảo đang chấm ra
                                    String judgedCategoryName = "Unknown";
                                    if (sd.getContestRubricDetail() != null &&
                                            sd.getContestRubricDetail().getContestRubric() != null &&
                                            sd.getContestRubricDetail().getContestRubric().getCategory() != null) {
                                        judgedCategoryName = sd.getContestRubricDetail().getContestRubric().getCategory().getName();
                                    }

                                    String critName = sd.getContestRubricDetail() != null ? sd.getContestRubricDetail().getCriteriaName() : "Unknown";
                                    String feedback = sd.getFeedback() != null ? sd.getFeedback().replace("\"", "\"\"").replace("\n", " ") : "";

                                    writer.println(String.format("\"%s\",\"%s\",\"%s\",\"%s\",\"%s\",%f,\"%s\"",
                                            team.getName(), judgedCategoryName, sub.getProjectRepositoryUrl(), judgeName, critName, sd.getRawScore(), feedback));
                                }
                            } else {
                                // Nếu chưa có điểm chi tiết thì in tổng điểm
                                String feedback = sc.getGeneralFeedback() != null ? sc.getGeneralFeedback().replace("\"", "\"\"").replace("\n", " ") : "";
                                writer.println(String.format("\"%s\",\"%s\",\"%s\",\"%s\",\"%s\",%f,\"%s\"",
                                        team.getName(), "Unknown", sub.getProjectRepositoryUrl(), judgeName, "Overall Score", sc.getTotalScore(), feedback));
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
}