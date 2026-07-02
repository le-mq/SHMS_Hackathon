package com.fpt.shms.be.service;

import com.fpt.shms.be.dto.CreateRubricRequest;
import com.fpt.shms.be.model.*;
import com.fpt.shms.be.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class RubricAdminService {

    private final RubricTemplateRepository rubricTemplateRepository;
    private final CategoryRepository categoryRepository;
    private final ContestRubricRepository contestRubricRepository;
    private final ContestRubricDetailsRepository contestRubricDetailsRepository;
    private final AuditLogService auditLogService;

    @Transactional
    public ContestRubric createRubric(CreateRubricRequest request) {

        double totalWeight = request.getCriteria().stream()
                .mapToDouble(CreateRubricRequest.CriterionDto::getPercentageWeight)
                .sum();

        if (Math.abs(totalWeight - 100.0) > 0.01) {
            throw new IllegalArgumentException("Total weight must equal exactly 100%. Current: " + totalWeight + "%");
        }

        Category category = categoryRepository.findById(request.getCategoryId())
                .orElseThrow(() -> new IllegalArgumentException("Category not found"));

        if (!contestRubricRepository.findByCategoryId(category.getId()).isEmpty()) {
            throw new IllegalArgumentException("This category already has an official rubric assigned. Cannot overwrite. Please edit the existing official rubric.");
        }

        RubricTemplate template = RubricTemplate.builder()
                .name(request.getName())
                .category(category)
                .publicVisibility(request.getPublicVisibility())
                .weightedScoring(request.getWeightedScoring())
                .status("ACTIVE")
                .criteria(new ArrayList<>())
                .build();

        for (CreateRubricRequest.CriterionDto critDto : request.getCriteria()) {
            RubricTemplateCriteria crit = RubricTemplateCriteria.builder()
                    .rubricTemplate(template)
                    .criteriaName(critDto.getCriteriaName())
                    .description(critDto.getDescription())
                    .maxScore(critDto.getMaxScore())
                    .percentageWeight(critDto.getPercentageWeight())
                    .build();
            template.getCriteria().add(crit);
        }

        template = rubricTemplateRepository.save(template);


        ContestRubric contestRubric = ContestRubric.builder()
                .category(category)
                .rubricTemplate(template)
                .rubricName(request.getName())
                .totalWeight(totalWeight)
                .status("ACTIVE")
                .build();

        contestRubric = contestRubricRepository.save(contestRubric);
        syncContestRubricDetails(contestRubric, template.getCriteria());
        auditLogService.log("CREATE_CONTEST_RUBRIC", "ContestRubric", category.getName() + " Rubric", null, contestRubric.getStatus(), "Created rubric for category: " + category.getName());
        return contestRubric;
    }


    @Transactional
    public RubricTemplate createTemplateOnly(CreateRubricRequest request) {
        double totalWeight = request.getCriteria().stream()
                .mapToDouble(CreateRubricRequest.CriterionDto::getPercentageWeight)
                .sum();
        if (Math.abs(totalWeight - 100.0) > 0.01) {
            throw new IllegalArgumentException("Total weight must equal exactly 100%. Current: " + totalWeight + "%");
        }
        Category category = null;
        if (request.getCategoryId() != null) {
            category = categoryRepository.findById(request.getCategoryId())
                    .orElseThrow(() -> new IllegalArgumentException("Category not found"));
        } else {
            throw new IllegalArgumentException("Category ID is required");
        }
        RubricTemplate template = RubricTemplate.builder()
                .name(request.getName())
                .description(request.getDescription())
                .category(category)
                .publicVisibility(request.getPublicVisibility() != null ? request.getPublicVisibility() : true)
                .weightedScoring(request.getWeightedScoring() != null ? request.getWeightedScoring() : true)
                .status("DRAFT")
                .criteria(new ArrayList<>())
                .build();
        for (CreateRubricRequest.CriterionDto critDto : request.getCriteria()) {
            RubricTemplateCriteria crit = RubricTemplateCriteria.builder()
                    .rubricTemplate(template)
                    .criteriaName(critDto.getCriteriaName())
                    .description(critDto.getDescription())
                    .maxScore(critDto.getMaxScore())
                    .percentageWeight(critDto.getPercentageWeight())
                    .build();
            template.getCriteria().add(crit);
        }
        RubricTemplate savedTemplate = rubricTemplateRepository.save(template);
        auditLogService.log("CREATE_RUBRIC_TEMPLATE", "RubricTemplate", savedTemplate.getName(), null, savedTemplate.getStatus(), "Created template: " + savedTemplate.getName());
        return savedTemplate;
    }


    public List<RubricTemplate> getAllTemplates() {
        return rubricTemplateRepository.findAll();
    }

    @Transactional(readOnly = true)
    public List<java.util.Map<String, Object>> getAllContestRubrics() {
        return contestRubricRepository.findAll().stream().map(cr -> {
            java.util.Map<String, Object> map = new java.util.HashMap<>();
            map.put("id", cr.getId());
            map.put("categoryId", cr.getCategory().getId());
            map.put("roundId", null);
            map.put("templateId", cr.getRubricTemplate().getId());
            map.put("contestId", cr.getCategory().getContest().getId());
            return map;
        }).collect(Collectors.toList());
    }

    public RubricTemplate getTemplateById(Long id) {
        return rubricTemplateRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Rubric template not found"));
    }

    public RubricTemplate cloneTemplate(Long id) {
        RubricTemplate original = getTemplateById(id);
        RubricTemplate cloned = RubricTemplate.builder()
                .name(original.getName() + " (Copy)")
                .description(original.getDescription())
                .category(original.getCategory())
                .publicVisibility(original.getPublicVisibility())
                .weightedScoring(original.getWeightedScoring())
                .status("DRAFT")
                .criteria(new ArrayList<>())
                .build();

        List<RubricTemplateCriteria> clonedCriteria = original.getCriteria().stream()
                .map(c -> RubricTemplateCriteria.builder()
                        .rubricTemplate(cloned)
                        .criteriaName(c.getCriteriaName())
                        .description(c.getDescription())
                        .maxScore(c.getMaxScore())
                        .percentageWeight(c.getPercentageWeight())
                        .build())
                .collect(Collectors.toList());
        cloned.setCriteria(clonedCriteria);
        RubricTemplate clonedTemplate = rubricTemplateRepository.save(cloned);
        auditLogService.log("CLONE_RUBRIC_TEMPLATE", "RubricTemplate", clonedTemplate.getName(), null, clonedTemplate.getStatus(), "Cloned from template: " + original.getName());
        return clonedTemplate;
    }

    @Transactional
    public RubricTemplate updateTemplate(Long id, CreateRubricRequest request) {
        RubricTemplate template = getTemplateById(id);
        template.setName(request.getName());
        template.setDescription(request.getDescription());
        template.setPublicVisibility(request.getPublicVisibility());
        template.setWeightedScoring(request.getWeightedScoring());
        if (request.getCategoryId() != null) {
            Category category = categoryRepository.findById(request.getCategoryId())
                    .orElseThrow(() -> new IllegalArgumentException("Category not found"));
            template.setCategory(category);
        }

        template.getCriteria().clear();

        for (CreateRubricRequest.CriterionDto critDto : request.getCriteria()) {
            RubricTemplateCriteria crit = RubricTemplateCriteria.builder()
                    .rubricTemplate(template)
                    .criteriaName(critDto.getCriteriaName())
                    .description(critDto.getDescription())
                    .maxScore(critDto.getMaxScore())
                    .percentageWeight(critDto.getPercentageWeight())
                    .build();
            template.getCriteria().add(crit);
        }
        RubricTemplate savedTemplate = rubricTemplateRepository.save(template);
        auditLogService.log("UPDATE_RUBRIC_TEMPLATE", "RubricTemplate", savedTemplate.getName(), null, savedTemplate.getStatus(), "Updated template: " + savedTemplate.getName());

        List<ContestRubric> contestRubrics = contestRubricRepository.findByRubricTemplateId(id);
        for (ContestRubric cr : contestRubrics) {
            cr.setRubricName(request.getName());
            cr.setTotalWeight(request.getCriteria().stream().mapToDouble(CreateRubricRequest.CriterionDto::getPercentageWeight).sum());
            contestRubricRepository.save(cr);

            contestRubricDetailsRepository.deleteByContestRubricId(cr.getId());
            syncContestRubricDetails(cr, savedTemplate.getCriteria());
        }
        if (request.getContestId() != null && request.getCategoryId() != null) {
            Category category = categoryRepository.findById(request.getCategoryId()).orElse(null);
            if (category != null) {
                List<ContestRubric> existingCatRubrics = contestRubricRepository.findByCategoryId(category.getId());
                boolean alreadyBoundToThisTemplate = existingCatRubrics.stream().anyMatch(cr -> cr.getRubricTemplate().getId().equals(savedTemplate.getId()));

                if (!alreadyBoundToThisTemplate) {
                    if (!existingCatRubrics.isEmpty()) {
                        throw new IllegalArgumentException("This category already has an official rubric assigned. Cannot overwrite. Please edit the existing official rubric.");
                    }

                    double totalWeight = request.getCriteria().stream().mapToDouble(CreateRubricRequest.CriterionDto::getPercentageWeight).sum();
                    ContestRubric newContestRubric = ContestRubric.builder()
                            .category(category)
                            .rubricTemplate(savedTemplate)
                            .rubricName(request.getName())
                            .totalWeight(totalWeight)
                            .status("ACTIVE")
                            .build();
                    newContestRubric = contestRubricRepository.save(newContestRubric);
                    syncContestRubricDetails(newContestRubric, savedTemplate.getCriteria());
                }
            }
        }

        return savedTemplate;
    }

    @Transactional
    public void deleteTemplate(Long id) {
        RubricTemplate template = getTemplateById(id);
        List<ContestRubric> contestRubrics = contestRubricRepository.findByRubricTemplateId(id);

        if (!contestRubrics.isEmpty() || "ACTIVE".equals(template.getStatus())) {
            throw new IllegalStateException("Cannot delete Rubric because it is ACTIVED and in use.");
        }

        rubricTemplateRepository.delete(template);
        auditLogService.log("DELETE_RUBRIC_TEMPLATE", "RubricTemplate", template.getName(), template.getStatus(), "DELETED", "Deleted template: " + template.getName());
    }

    private void syncContestRubricDetails(ContestRubric contestRubric, List<RubricTemplateCriteria> criteria) {
        for (RubricTemplateCriteria c : criteria) {
            contestRubricDetailsRepository.save(ContestRubricDetails.builder()
                    .contestRubric(contestRubric)
                    .criteriaName(c.getCriteriaName())
                    .description(c.getDescription())
                    .maxScore(c.getMaxScore())
                    .percentageWeight(c.getPercentageWeight())
                    .build());
        }
    }
}
