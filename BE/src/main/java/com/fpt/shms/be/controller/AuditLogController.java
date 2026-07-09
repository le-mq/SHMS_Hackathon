package com.fpt.shms.be.controller;

import com.fpt.shms.be.model.AuditLog;
import com.fpt.shms.be.service.AuditLogService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.io.PrintWriter;
import java.time.format.DateTimeFormatter;
import java.util.List;

@RestController
@RequestMapping("/api/v1/admin/audit-logs")
@PreAuthorize("hasAuthority('ADMIN')")
@RequiredArgsConstructor
@Tag(name = "Audit Log", description = "System History Management")
public class AuditLogController {

    private final AuditLogService auditLogService;

    @GetMapping
    @Operation(summary = "Get all Audit Logs")
    public ResponseEntity<List<AuditLog>> getAuditLogs() {
        return ResponseEntity.ok(auditLogService
                .getAllLogs());
    }

    @GetMapping("/export-csv")
    @Operation(summary = "Export Audit Logs CSV", description = "Exports all audit log history to a CSV file.")
    public void exportCsv(HttpServletResponse response) {
        try {
            response.setContentType("text/csv; charset=UTF-8");
            response.setHeader(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"audit_logs_export.csv\"");

            PrintWriter writer = response.getWriter();
            writer.write('\ufeff');

            writer.println("Log ID,Performed At,Performer ID,Performer Username,Performer Email,Performer Name,Action Type,Entity Type,Entity Name,Old Value,New Value,Reason");

            List<AuditLog> logs = auditLogService.getAllLogs();
            DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

            for (AuditLog log : logs) {
                String logId = log.getId() != null ? String.valueOf(log.getId()) : "";
                String performedAt = log.getPerformedAt() != null ? log.getPerformedAt().format(formatter) : "";

                String performerId = "";
                String performerUsername = "System";
                String performerEmail = "";
                String performerName = "System";
                if (log.getUser() != null) {
                    performerId = log.getUser().getId() != null ? String.valueOf(log.getUser().getId()) : "";
                    performerUsername = log.getUser().getUsername() != null ? log.getUser().getUsername() : "";
                    performerEmail = log.getUser().getEmail() != null ? log.getUser().getEmail() : "";
                    performerName = log.getUser().getFullName() != null ? log.getUser().getFullName() : (performerUsername.isEmpty() ? performerEmail : performerUsername);
                }

                String actionType = escapeCsv(log.getAction());
                String entityType = escapeCsv(log.getEntityType());
                String entityName = escapeCsv(log.getEntityName());
                String oldValue = escapeCsv(log.getOldValue());
                String newValue = escapeCsv(log.getNewValue());
                String reason = escapeCsv(log.getReason());

                writer.println(String.format("\"%s\",\"%s\",\"%s\",\"%s\",\"%s\",\"%s\",\"%s\",\"%s\",\"%s\",\"%s\",\"%s\",\"%s\"",
                        logId, performedAt, performerId, escapeCsv(performerUsername), escapeCsv(performerEmail), escapeCsv(performerName),
                        actionType, entityType, entityName, oldValue, newValue, reason));
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