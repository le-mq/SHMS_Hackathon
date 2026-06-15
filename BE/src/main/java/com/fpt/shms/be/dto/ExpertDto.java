package com.fpt.shms.be.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
public class ExpertDto {
    private Long userId;
    private String username;
    private String fullName;
    private String professionalEmail;
    private List<String> roles;
    private LocalDateTime accessExpiry;
}
