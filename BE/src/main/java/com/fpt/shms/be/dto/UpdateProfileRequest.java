package com.fpt.shms.be.dto;

import lombok.Data;

@Data
public class UpdateProfileRequest {
    private String telephoneNumber;
    private String currentPassword;
    private String newPassword;
    private String avatarBase64;
}
