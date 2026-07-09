package com.fpt.shms.be.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.beans.factory.annotation.Value;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmailService {

    private final JavaMailSender mailSender;

    @Value("${app.mail.sender}")
    private String senderEmail;

    public void sendVerificationEmail(String toEmail, String otp) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(senderEmail);
            message.setTo(toEmail);
            message.setSubject("SEAL Hackathon - Email Verification OTP");
            message.setText("Your OTP for account verification is: " + otp + "\n\nThis OTP will expire in 3 minutes.");

            mailSender.send(message);
            log.info("Sent verification OTP to: {}", toEmail);
        } catch (Exception e) {
            log.error("Failed to send email to {}", toEmail, e);
        }
    }

    @Async
    public void sendExpertWelcomeEmailAsync(String toEmail, String fullName, String username, String password, String role) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(senderEmail);
            message.setTo(toEmail);
            message.setSubject("SEAL Hackathon - Expert Account Credentials");

            String textContent = "Welcome, " + fullName + "!\n\n" +
                    "You have been successfully registered as a " + role + " for the SEAL Hackathon.\n\n" +
                    "Here are your login credentials:\n" +
                    "Username: " + username + "\n" +
                    "Password: " + password + "\n\n" +
                    "For security reasons, we strongly recommend changing your password after your first login.";

            message.setText(textContent);

            mailSender.send(message);
            log.info("Sent welcome email to expert: {}", toEmail);
        } catch (Exception e) {
            log.error("Failed to send welcome email to {}", toEmail, e);
        }
    }
    @Async
    public void sendTeamInvitationEmailAsync(String toEmail, String invitedName, String inviterName, String teamName, String token) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(senderEmail);
            message.setTo(toEmail);
            message.setSubject("SEAL Hackathon - Team Invitation");

            String textContent = "Hi " + invitedName + ",\n\n" +
                    inviterName + " has invited you to join the team " + teamName + ".\n\n" +
                    "Your personalized Invite code is: " + token + "\n\n" +
                    "You can enter this code in the Join Team section to accept the invitation.";

            message.setText(textContent);

            mailSender.send(message);
            log.info("Sent team invitation email to: {}", toEmail);
        } catch (Exception e) {
            log.error("Failed to send team invitation email to {}", toEmail, e);
        }
    }

    @Async
    public void sendExpertAllocationEmailAsync(String toEmail, String fullName, String roundName, String trackName, java.util.List<String> mentoredTeams, boolean isJudge) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(senderEmail);
            message.setTo(toEmail);
            message.setSubject("S-HMS Hackathon - New Assignment Notification");

            StringBuilder textContent = new StringBuilder();
            textContent.append("Dear ").append(fullName != null ? fullName : "Expert").append(",\n\n");
            textContent.append("We are pleased to inform you that you have been assigned a new task in round ").append(roundName).append(".\n\n");

            textContent.append("Assignment details:\n");
            if (isJudge) {
                textContent.append("⚖️ Judging Task: Evaluate teams in Track ").append(trackName).append(".\n");
            }
            if (mentoredTeams != null && !mentoredTeams.isEmpty()) {
                textContent.append("🤝 Mentoring Task: Responsible for mentoring the following teams: ")
                        .append(String.join(", ", mentoredTeams)).append(".\n");
            }

            textContent.append("\nPlease log in to the S-HMS system to view details and carry out your assignment.\n\n");
            textContent.append("Best regards,\nS-HMS Hackathon Organizing Committee.");

            message.setText(textContent.toString());

            mailSender.send(message);
            log.info("Sent allocation notification email to expert: {}", toEmail);
        } catch (Exception e) {
            log.error("Failed to send allocation notification email to {}", toEmail, e);
        }
    }

    @Async
    public void sendTeamStatusNotificationAsync(String toEmail, String fullName, String teamName, String status, String reason) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(senderEmail);
            message.setTo(toEmail);
            message.setSubject("SEAL Hackathon - Team Registration Update");

            StringBuilder textContent = new StringBuilder();
            textContent.append("Dear ").append(fullName != null ? fullName : "Participant").append(",\n\n");

            if ("APPROVED".equalsIgnoreCase(status)) {
                textContent.append("Great news! Your team '").append(teamName).append("' has been APPROVED for the SEAL Hackathon.\n\n");
            } else if ("REJECTED".equalsIgnoreCase(status) || "CANCELED".equalsIgnoreCase(status) || "CANCELLED".equalsIgnoreCase(status)) {
                textContent.append("We regret to inform you that the registration for your team '").append(teamName).append("' has been ").append(status.toUpperCase()).append(".\n\n");
            } else {
                textContent.append("The status of your team '").append(teamName).append("' has been updated to ").append(status.toUpperCase()).append(".\n\n");
            }

            if (reason != null && !reason.trim().isEmpty()) {
                textContent.append("Reason provided by Admin:\n");
                textContent.append(reason).append("\n\n");
            }

            textContent.append("If you have any questions, please contact the organizing committee.\n\n");
            textContent.append("Best regards,\nSEAL Hackathon Organizing Committee");

            message.setText(textContent.toString());

            mailSender.send(message);
            log.info("Sent team status notification email to: {} for team: {}", toEmail, teamName);
        } catch (Exception e) {
            log.error("Failed to send team status notification email to {}", toEmail, e);
        }
    }
}
