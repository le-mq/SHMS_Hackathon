package com.fpt.shms.be.controller;

import com.fpt.shms.be.dto.PublicHomeResponse;
import com.fpt.shms.be.service.PublicHomeService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/public")
@RequiredArgsConstructor
@Tag(name = "Public", description = "Publicly accessible endpoints (no auth required)")
public class PublicHomeController {

    private final PublicHomeService publicHomeService;

    @GetMapping("/home")
    @Operation(
            summary     = "Get public home page data",
            description = "Returns contests, tracks, announcements and stats for the public-facing home page."
    )
    public ResponseEntity<PublicHomeResponse> getHome() {
        return ResponseEntity.ok(publicHomeService.getHomeData());
    }

    @GetMapping("/universities")
    @Operation(summary = "Get list of universities", description = "Returns all available universities with their validation rules")
    public ResponseEntity<java.util.List<com.fpt.shms.be.dto.UniversityDto>> getUniversities() {
        return ResponseEntity.ok(publicHomeService.getUniversitiesDetailed());
    }



}
