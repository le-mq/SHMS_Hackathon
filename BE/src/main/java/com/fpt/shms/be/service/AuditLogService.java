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
    public void log(String action, String entityType, Long entityId, String oldValue, String newValue, String reason) {

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
                .entityId(entityId)
                .oldValue(oldValue)
                .newValue(newValue)
                .reason(reason)
                .build();

        auditLogRepository.save(auditLog);
    }

    @Transactional
    public void logChangeUserRole(Long userId, String oldRole, String newRole, String reason) {
        log(ACTION_CHANGE_USER_ROLE, "User", userId, oldRole, newRole, reason);
    }

    @Transactional
    public void logUpdateStudentVerification(Long studentId, String oldStatus, String newStatus, String reason) {
        log(ACTION_UPDATE_STUDENT_VERIFICATION, "StudentVerification", studentId, oldStatus, newStatus, reason);
    }

    @Transactional
    public void logCancelTeam(Long teamId, String oldStatus, String reason) {
        log(ACTION_CANCEL_TEAM, "Team", teamId, oldStatus, "CANCELLED", reason);
    }

    @Transactional
    public void logUpdateSubmissionDeadline(Long roundId, String oldDeadline, String newDeadline, String reason) {
        log(ACTION_UPDATE_SUBMISSION_DEADLINE, "Round", roundId, oldDeadline, newDeadline, reason);
    }

    @Transactional
    public void logEditSubmittedScore(Long scoreId, String oldScore, String newScore, String reason) {
        log(ACTION_EDIT_SUBMITTED_SCORE, "Score", scoreId, oldScore, newScore, reason);
    }
    
    @Transactional(readOnly = true)
    public List<AuditLog> getAllLogs() {
        return auditLogRepository.findAll(org.springframework.data.domain.Sort.by(org.springframework.data.domain.Sort.Direction.DESC, "performedAt"));
    }
}