package com.fpt.shms.be.config;


import io.swagger.v3.oas.annotations.OpenAPIDefinition;
import io.swagger.v3.oas.annotations.enums.SecuritySchemeType;
import io.swagger.v3.oas.annotations.info.Info;
import io.swagger.v3.oas.annotations.security.SecurityScheme;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import org.springframework.context.annotation.Configuration;

@Configuration
@OpenAPIDefinition(
        info = @Info(title = "SHMS Hackathon API", version = "1.0",
        description = "API Documentation for SEAL Hackathon Management System"),
        security = {@SecurityRequirement(name = "bearerAuth")} // Áp dụng global token cho tất cả API
)


@SecurityScheme(
        name = "bearerAuth",
        type = SecuritySchemeType.HTTP,
        scheme = "bearer",
        bearerFormat = "JWT",
        description = "Enter your JWT Token here (No need to add Bearer before it)"
)


public class OpenApiConfig {
}
