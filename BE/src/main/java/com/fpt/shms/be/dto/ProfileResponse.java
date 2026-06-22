package com.fpt.shms.be.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class ProfileResponse {
    private String fullName;
    private String studentCode;
    private String major;
    private String corporateEmail;

    private String telephoneNumber;
    private String avatarBase64;
    private String role;
    private Boolean isEmailVerified;
}
