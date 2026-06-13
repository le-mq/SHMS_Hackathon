package com.fpt.shms.be.controller;
import com.fpt.shms.be.service.StudentService;
import com.fpt.shms.be.util.JwtUtils;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/student")
@RequiredArgsConstructor
@Tag(name = "Student", description = "Student Profile APIs")
public class StudentController {

    private final StudentService studentService;
    private final JwtUtils jwtUtils;

    private String extractUsernameFromToken(HttpServletRequest request) {
        String header = request.getHeader("Authorization");
        if (header == null || !header.startsWith("Bearer ")) {
            throw new IllegalArgumentException("Missing or invalid Authorization header");
        }
        String token = header.substring(7);
        return jwtUtils.extractUsername(token);
    }

    private String extractRoleFromToken(HttpServletRequest request) {
        String header = request.getHeader("Authorization");
        String token = header.substring(7);
        return jwtUtils.extractRole(token);
    }

}
