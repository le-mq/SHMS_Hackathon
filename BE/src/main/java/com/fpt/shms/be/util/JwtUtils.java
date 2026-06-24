package com.fpt.shms.be.util;

import org.springframework.stereotype.Component;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;

@Component
public class JwtUtils {

    // In a real application, this should be injected from environment variables
    private final String SECRET_KEY = "SHMS_Hackathon_Super_Secret_Key_For_JWT_Signing_Must_Be_Long_Enough";
    private final long EXPIRATION_TIME = 604800000; // 24 hours

    private SecretKey getSigningKey() {
        byte[] keyBytes = SECRET_KEY.getBytes(StandardCharsets.UTF_8);
        return Keys.hmacShaKeyFor(keyBytes);
    }

    public String generateToken(String username, String selectedRole) {
        return Jwts.builder()
                .subject(username)
                .claim("role", selectedRole) // Dynamic context payload mutation
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + EXPIRATION_TIME))
                .signWith(getSigningKey())
                .compact();
    }

    public String extractUsername(String token) {
        return Jwts.parser()
                .verifyWith(getSigningKey())
                .build()
                .parseSignedClaims(token)
                .getPayload()
                .getSubject();
    }

    public String extractRole(String token) {
        return Jwts.parser()
                .verifyWith(getSigningKey())
                .build()
                .parseSignedClaims(token)
                .getPayload()
                .get("role", String.class);
    }

    /**
     * Extracts Bearer token from the Authorization header of an HTTP request.
     * Returns null if header is missing or malformed.
     */
    public String extractToken(jakarta.servlet.http.HttpServletRequest request) {
        String header = request.getHeader("Authorization");
        if (header != null && header.startsWith("Bearer ")) {
            return header.substring(7);
        }
        String paramToken = request.getParameter("token");
        if (paramToken != null && !paramToken.isEmpty()) {
            return paramToken;
        }
        return null;
    }

    /**
     * Validates a JWT token. Returns false if the token is expired or malformed.
     */
    public boolean validateToken(String token) {
        try {
            Jwts.parser().verifyWith(getSigningKey()).build().parseSignedClaims(token);
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    /** Alias for extractUsername â€” used by controllers that call getUsernameFromToken. */
    public String getUsernameFromToken(String token) {
        return extractUsername(token);
    }
}
