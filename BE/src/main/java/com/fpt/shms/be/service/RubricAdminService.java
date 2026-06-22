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
    private final RoundRepository roundRepository;
    private final ContestRubricRepository contestRubricRepository;
    private final ContestRubricDetailsRepository contestRubricDetailsRepository;

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

        Round round = roundRepository.findById(request.getRoundId())
                .orElseThrow(() -> new IllegalArgumentException("Round not found"));

        if (round.getContest() == null || category.getContest() == null || !round.getContest().getId().equals(category.getContest().getId())) {
            throw new IllegalArgumentException("Round does not belong to the specified contest");
        }

        RubricTemplate template = RubricTemplate.builder()
                .name(request.getName())
                .category(category)
                .publicVisibility(request.getPublicVisibility())
                .weightedScoring(request.getWeightedScoring())
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
                .round(round)
                .rubricTemplate(template)
                .rubricName(request.getName())
                .totalWeight(totalWeight)
                .status("ACTIVE")
                .build();

        contestRubric = contestRubricRepository.save(contestRubric);
        syncContestRubricDetails(contestRubric, template.getCriteria());
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
        return rubricTemplateRepository.save(template);
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
            map.put("roundId", cr.getRound().getId());
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
                .publicVisibility(original.getPublicVisibility())
                .weightedScoring(original.getWeightedScoring())
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
        return rubricTemplateRepository.save(cloned);
    }

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
        template = rubricTemplateRepository.save(template);

        if (request.getCategoryId() != null && request.getRoundId() != null) {
            Category category = template.getCategory();
            Round round = roundRepository.findById(request.getRoundId())
                    .orElseThrow(() -> new IllegalArgumentException("Round not found"));
            if (round.getContest() == null || category.getContest() == null || !round.getContest().getId().equals(category.getContest().getId())) {
                throw new IllegalArgumentException("Round does not belong to the specified contest");
            }
            ContestRubric contestRubric = ContestRubric.builder()
                    .category(category)
                    .round(round)
                    .rubricTemplate(template)
                    .rubricName(template.getName())
                    .totalWeight(100.0)
                    .status("ACTIVE")
                    .build();
            contestRubric = contestRubricRepository.save(contestRubric);
            syncContestRubricDetails(contestRubric, template.getCriteria());
        }
        return template;
    }

    public void deleteTemplate(Long id) {
        rubricTemplateRepository.deleteById(id);
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
