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
                .map(domain -> domain.replace(".", "\\."))
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

        Pattern pattern = Pattern.compile("^(.*?)(\\d+)$");

        Map<Integer, Set<String>> groupedByLength = sampleStudentIds.stream()
                .filter(id -> id != null && !id.trim().isEmpty())
                .map(String::trim)
                .map(pattern::matcher)
                .filter(Matcher::matches)
                .collect(Collectors.groupingBy(
                        matcher -> matcher.group(2).length(),
                        Collectors.mapping(matcher -> matcher.group(1).toUpperCase().replaceAll("\\d", "[0-9]"), Collectors.toSet())
                ));

        if (groupedByLength.isEmpty()) {
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
