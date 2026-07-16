package com.fpt.shms.be.util;

import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

public class RegexGeneratorUtil {

    public static String generateEmailRegex(List<String> sampleEmails) {
        if (sampleEmails == null || sampleEmails.isEmpty()) {
            return null;
        }

        Set<String> domains = sampleEmails.stream()
                .filter(email -> email != null && email.contains("@"))
                .map(email -> email.substring(email.lastIndexOf("@") + 1).trim())
                .map(domain -> domain.replace(".", "\\.")) // Escape dot
                .collect(Collectors.toSet());

        if (domains.isEmpty()) {
            return null;
        }

        String joinedDomains = String.join("|", domains);
        return "^[a-zA-Z0-9._%+-]+@(" + joinedDomains + ")$";
    }

    public static String generateStudentCodeRegex(List<String> sampleStudentIds) {
        if (sampleStudentIds == null || sampleStudentIds.isEmpty()) {
            return null;
        }

        // We want to extract prefix and suffix length.
        // e.g., SE190001 -> prefix: SE, suffix length: 6
        // C12345 -> prefix: C, suffix length: 5
        // Use ^(.*?)(\\d+)$ to support empty prefixes or mixed prefixes (e.g., 12345678, 12DH123456)
        Pattern pattern = Pattern.compile("^(.*?)(\\d+)$");

        // Group by suffix length, then collect prefixes
        Map<Integer, Set<String>> groupedByLength = sampleStudentIds.stream()
                .filter(id -> id != null && !id.trim().isEmpty())
                .map(String::trim)
                .map(pattern::matcher)
                .filter(Matcher::matches)
                .collect(Collectors.groupingBy(
                        matcher -> matcher.group(2).length(),
                        Collectors.mapping(matcher -> matcher.group(1).toUpperCase(), Collectors.toSet())
                ));

        if (groupedByLength.isEmpty()) {
            // Fallback if none match the Prefix+Number pattern
            return null;
        }

        List<String> parts = groupedByLength.entrySet().stream()
                .map(entry -> {
                    int length = entry.getKey();
                    Set<String> prefixes = entry.getValue();
                    String joinedPrefixes = String.join("|", prefixes);
                    if (prefixes.size() > 1) {
                        return "(" + joinedPrefixes + ")\\d{" + length + "}";
                    } else {
                        String singlePrefix = prefixes.iterator().next();
                        if (singlePrefix.isEmpty()) {
                            return "\\d{" + length + "}";
                        }
                        return singlePrefix + "\\d{" + length + "}";
                    }
                })
                .collect(Collectors.toList());

        if (parts.size() == 1) {
            return "^(" + parts.get(0) + ")$";
        } else {
            return "^(" + String.join("|", parts) + ")$";
        }
    }
}
