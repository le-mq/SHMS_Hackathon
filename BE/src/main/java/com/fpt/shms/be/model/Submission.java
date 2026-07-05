package com.fpt.shms.be.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.HashMap;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

@Entity
@Table(name = "Submission")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Submission {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "submission_id")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "team_id", referencedColumnName = "team_id", nullable = false)
    private Team team;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "round_id", referencedColumnName = "round_id", nullable = true)
    private Round round;

    @Column(name = "submission_data", columnDefinition = "NVARCHAR(MAX)")
    private String submissionData;

    @Column(name = "version")
    private Integer version;

    @Column(name = "history_log", columnDefinition = "TEXT")
    private String historyLog;

    @Column(name = "submitted_at")
    private LocalDateTime submittedAt;

    @Column(name = "status", length = 50)
    private String status; // "DRAFT", "OFFICIAL", "SUBMITTED", "EVALUATED"

    @Column(name = "mentor_feedback", columnDefinition = "NVARCHAR(MAX)")
    private String mentorFeedback;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "mentor_id", referencedColumnName = "user_id")
    private User mentor;

    @Transient
    private static final ObjectMapper mapper = new ObjectMapper();

    @Transient
    private String getFieldValue(String key) {
        if (submissionData == null || submissionData.isEmpty()) return null;
        try {
            Map<String, String> map = mapper.readValue(submissionData, new TypeReference<Map<String, String>>() {});
            return map.get(key);
        } catch (Exception e) {
            return null;
        }
    }

    @Transient
    private void setFieldValue(String key, String value) {
        try {
            Map<String, String> map = new HashMap<>();
            if (submissionData != null && !submissionData.isEmpty()) {
                map = mapper.readValue(submissionData, new TypeReference<Map<String, String>>() {});
            }
            map.put(key, value);
            submissionData = mapper.writeValueAsString(map);
        } catch (Exception e) {
            // ignore
        }
    }

    @Transient
    public String getProjectRepositoryUrl() { return getFieldValue("githubRepoUrl"); }
    @Transient
    public void setProjectRepositoryUrl(String url) { setFieldValue("githubRepoUrl", url); }

    @Transient
    public String getDemoVideoUrl() { return getFieldValue("liveDemoUrl"); }
    @Transient
    public void setDemoVideoUrl(String url) { setFieldValue("liveDemoUrl", url); }

    @Transient
    public String getDocumentationUrl() { return getFieldValue("docsUrl"); }
    @Transient
    public void setDocumentationUrl(String url) { setFieldValue("docsUrl", url); }

    @Transient
    public String getPresentationSlideUrl() { return getFieldValue("slideUrl"); }
    @Transient
    public void setPresentationSlideUrl(String url) { setFieldValue("slideUrl", url); }
}
