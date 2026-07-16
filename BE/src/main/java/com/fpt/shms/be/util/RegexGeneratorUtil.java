package com.fpt.shms.be.util;

import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

public class RegexGeneratorUtil {

    private RegexGeneratorUtil() {
    }

    /**
     * Generate email regex from sample emails.
     *
     * Example:
     * student@fpt.edu.vn
     * abc@hcmut.edu.vn
     *
     * =>
     * ^[a-zA-Z0-9._%+-]+@(fpt\.edu\.vn|hcmut\.edu\.vn)$
     */
    public static String generateEmailRegex(List<String> sampleEmails) {

        if (sampleEmails == null || sampleEmails.isEmpty()) {
            return null;
        }

        Set<String> domains = sampleEmails.stream()
                .filter(email -> email != null && email.contains("@"))
                .map(String::trim)
                .map(email -> email.substring(email.lastIndexOf("@") + 1))
                .map(Pattern::quote)
                .collect(Collectors.toCollection(LinkedHashSet::new));

        if (domains.isEmpty()) {
            return null;
        }

        return "^[a-zA-Z0-9._%+-]+@(" +
                String.join("|", domains) +
                ")$";
    }

    /**
     * Generate Student ID regex from sample IDs.
     *
     * Examples:
     *
     * SE193544
     * -> ^[A-Z]{2}\d{6}$
     *
     * HE201234
     * -> ^[A-Z]{2}\d{6}$
     *
     * 12DH123456
     * -> ^\d{2}[A-Z]{2}\d{6}$
     *
     * K22CNTT001
     * -> ^[A-Z]{1}\d{2}[A-Z]{4}\d{3}$
     */
    public static String generateStudentCodeRegex(List<String> sampleStudentIds) {

        if (sampleStudentIds == null || sampleStudentIds.isEmpty()) {
            return null;
        }

        Set<String> generatedPatterns = sampleStudentIds.stream()
                .filter(id -> id != null && !id.isBlank())
                .map(String::trim)
                .map(String::toUpperCase)
                .map(RegexGeneratorUtil::buildPattern)
                .collect(Collectors.toCollection(LinkedHashSet::new));

        if (generatedPatterns.isEmpty()) {
            return null;
        }

        if (generatedPatterns.size() == 1) {
            return generatedPatterns.iterator().next();
        }

        return "^(" +
                generatedPatterns.stream()
                        .map(regex -> regex.substring(1, regex.length() - 1))
                        .collect(Collectors.joining("|"))
                + ")$";
    }

    /**
     * Convert one student ID into regex.
     *
     * Example:
     * SE193544
     *
     * =>
     * ^[A-Z]{2}\d{6}$
     */
    private static String buildPattern(String input) {

        StringBuilder regex = new StringBuilder("^");

        int i = 0;

        while (i < input.length()) {

            char current = input.charAt(i);

            if (Character.isLetter(current)) {

                int count = 0;

                while (i < input.length()
                        && Character.isLetter(input.charAt(i))) {
                    count++;
                    i++;
                }

                regex.append("[A-Z]{").append(count).append("}");

            } else if (Character.isDigit(current)) {

                int count = 0;

                while (i < input.length()
                        && Character.isDigit(input.charAt(i))) {
                    count++;
                    i++;
                }

                regex.append("\\d{").append(count).append("}");

            } else {

                regex.append(Pattern.quote(String.valueOf(current)));
                i++;
            }
        }

        regex.append("$");

        return regex.toString();
    }
}