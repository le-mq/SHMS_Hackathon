package com.fpt.shms.be.service;

import com.fpt.shms.be.model.AuditLog;
import com.fpt.shms.be.model.User;
import com.fpt.shms.be.repository.AuditLogRepository;
import com.fpt.shms.be.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class AuditLogService {

    private final AuditLogRepository auditLogRepository;
    private final UserRepository userRepository;

    public static final String ACTION_CHANGE_USER_ROLE = "CHANGE_USER_ROLE";
    public static final String ACTION_UPDATE_STUDENT_VERIFICATION = "UPDATE_STUDENT_VERIFICATION";
    public static final String ACTION_FORCE_KICK_MEMBER = "FORCE_KICK_MEMBER";
    public static final String ACTION_CANCEL_TEAM = "CANCEL_TEAM";
    public static final String ACTION_UPDATE_SUBMISSION_DEADLINE = "UPDATE_SUBMISSION_DEADLINE";
    public static final String ACTION_EDIT_SUBMITTED_SCORE = "EDIT_SUBMITTED_SCORE";

    @Transactional
    public void log(String action, String entityType, String entityName, String oldValue, String newValue, String reason) {

        String username = null;
        try {
            username = SecurityContextHolder.getContext().getAuthentication().getName();
        } catch (Exception ignored) {}

        User user = null;
        if (username != null && !username.equals("anonymousUser")) {
            user = userRepository.findByUsername(username).orElse(null);
        }

        AuditLog auditLog = AuditLog.builder()
                .user(user)
                .action(action)
                .entityType(entityType)
                .entityName(entityName)
                .oldValue(oldValue)
                .newValue(newValue)
                .reason(reason)
                .build();

        auditLogRepository.save(auditLog);
    }

    @Transactional
    public void log(String action, String entityType, Long entityId, String oldValue, String newValue, String reason) {
        log(action, entityType, entityId != null ? String.valueOf(entityId) : null, oldValue, newValue, reason);
    }

    @Transactional
    public void logChangeUserRole(String username, String oldRole, String newRole, String reason) {
        log(ACTION_CHANGE_USER_ROLE, "User", username, oldRole, newRole, reason);
    }

    @Transactional
    public void logChangeUserRole(Long userId, String oldRole, String newRole, String reason) {
        log(ACTION_CHANGE_USER_ROLE, "User", userId != null ? String.valueOf(userId) : null, oldRole, newRole, reason);
    }

    @Transactional
    public void logUpdateStudentVerification(String studentInfo, String oldStatus, String newStatus, String reason) {
        log(ACTION_UPDATE_STUDENT_VERIFICATION, "StudentVerification", studentInfo, oldStatus, newStatus, reason);
    }

    @Transactional
    public void logUpdateStudentVerification(Long studentId, String oldStatus, String newStatus, String reason) {
        log(ACTION_UPDATE_STUDENT_VERIFICATION, "StudentVerification", studentId != null ? String.valueOf(studentId) : null, oldStatus, newStatus, reason);
    }

    @Transactional
    public void logCancelTeam(String teamName, String oldStatus, String reason) {
        log(ACTION_CANCEL_TEAM, "Team", teamName, oldStatus, "CANCELLED", reason);
    }

    @Transactional
    public void logCancelTeam(Long teamId, String oldStatus, String reason) {
        log(ACTION_CANCEL_TEAM, "Team", teamId != null ? String.valueOf(teamId) : null, oldStatus, "CANCELLED", reason);
    }

    @Transactional
    public void logUpdateSubmissionDeadline(String roundName, String oldDeadline, String newDeadline, String reason) {
        log(ACTION_UPDATE_SUBMISSION_DEADLINE, "Round", roundName, oldDeadline, newDeadline, reason);
    }

    @Transactional
    public void logUpdateSubmissionDeadline(Long roundId, String oldDeadline, String newDeadline, String reason) {
        log(ACTION_UPDATE_SUBMISSION_DEADLINE, "Round", roundId != null ? String.valueOf(roundId) : null, oldDeadline, newDeadline, reason);
    }

    @Transactional
    public void logEditSubmittedScore(String scoreInfo, String oldScore, String newScore, String reason) {
        log(ACTION_EDIT_SUBMITTED_SCORE, "Score", scoreInfo, oldScore, newScore, reason);
    }

    @Transactional
    public void logEditSubmittedScore(Long scoreId, String oldScore, String newScore, String reason) {
        log(ACTION_EDIT_SUBMITTED_SCORE, "Score", scoreId != null ? String.valueOf(scoreId) : null, oldScore, newScore, reason);
    }
    
    @Transactional(readOnly = true)
    public List<AuditLog> getAllLogs() {
        return auditLogRepository.findAll(org.springframework.data.domain.Sort.by(org.springframework.data.domain.Sort.Direction.DESC, "performedAt"));
    }
}