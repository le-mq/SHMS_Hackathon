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
}
