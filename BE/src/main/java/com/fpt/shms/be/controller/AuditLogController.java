package com.fpt.shms.be.controller;

import com.fpt.shms.be.model.AuditLog;
import com.fpt.shms.be.service.AuditLogService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/admin/audit-logs")
@PreAuthorize("hasAuthority('ADMIN')")
@RequiredArgsConstructor
@Tag(name = "Audit Log", description = "System History Management")
public class AuditLogController {

    private final AuditLogService auditLogService;

    @GetMapping
    @Operation(summary = "Export all Audit Logs")
    public ResponseEntity<List<AuditLog>> getAuditLogs() {
        return ResponseEntity.ok(auditLogService
                .getAllLogs());
    }
}