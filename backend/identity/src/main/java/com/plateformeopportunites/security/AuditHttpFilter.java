package com.plateformeopportunites.security;

import com.plateformeopportunites.common.event.AuditTrailEvent;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Instant;
import java.util.Arrays;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Pattern;

@Slf4j
@Component
@RequiredArgsConstructor
public class AuditHttpFilter extends OncePerRequestFilter {

    private static final Pattern UUID_SEGMENT = Pattern.compile("^[0-9a-fA-F]{8}-[0-9a-fA-F-]{27,}$");
    private static final Pattern SAFE_CORRELATION_ID = Pattern.compile("^[A-Za-z0-9._-]{1,100}$");
    private static final Set<String> IGNORED_PREFIXES = Set.of(
            "/api/admin/audit-logs", "/api/health", "/actuator", "/api/events",
            "/swagger-ui", "/v3/api-docs", "/uploads"
    );

    private final ApplicationEventPublisher eventPublisher;

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getRequestURI();
        return "OPTIONS".equalsIgnoreCase(request.getMethod())
                || !path.startsWith("/api/")
                || IGNORED_PREFIXES.stream().anyMatch(path::startsWith);
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        long startedAt = System.nanoTime();
        String correlationId = correlationId(request.getHeader("X-Correlation-ID"));
        response.setHeader("X-Correlation-ID", correlationId);

        try {
            chain.doFilter(request, response);
        } finally {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            if (shouldRecord(request, authentication)) {
                try {
                    eventPublisher.publishEvent(buildEvent(request, response, authentication, correlationId, startedAt));
                } catch (Exception exception) {
                    // Une panne du journal ne doit jamais bloquer l'action métier demandée.
                    log.error("Impossible de publier l'événement d'audit {} {}", request.getMethod(), request.getRequestURI(), exception);
                }
            }
        }
    }

    private boolean shouldRecord(HttpServletRequest request, Authentication authentication) {
        boolean authenticated = authentication != null
                && authentication.isAuthenticated()
                && !(authentication instanceof AnonymousAuthenticationToken);
        boolean authenticationAttempt = request.getRequestURI().contains("/auth/")
                && !"GET".equalsIgnoreCase(request.getMethod());
        return authenticated || authenticationAttempt;
    }

    private AuditTrailEvent buildEvent(HttpServletRequest request, HttpServletResponse response,
                                       Authentication authentication, String correlationId, long startedAt) {
        String path = truncate(request.getRequestURI(), 500);
        String method = request.getMethod().toUpperCase(Locale.ROOT);
        String module = detectModule(path);
        String action = detectAction(method, path);
        String resourceId = detectResourceId(path);
        int statusCode = response.getStatus();

        return new AuditTrailEvent(
                Instant.now(), actorId(authentication), actorType(authentication), action, module,
                method, path, module, resourceId, statusCode, statusCode < 400,
                clientIp(request), truncate(request.getHeader("User-Agent"), 500), correlationId,
                (System.nanoTime() - startedAt) / 1_000_000, description(action, module, statusCode)
        );
    }

    private String actorId(Authentication authentication) {
        if (authentication == null || authentication instanceof AnonymousAuthenticationToken) return "ANONYME";
        return truncate(authentication.getName(), 100);
    }

    private String actorType(Authentication authentication) {
        if (authentication == null || authentication instanceof AnonymousAuthenticationToken) return "ANONYME";
        boolean admin = authentication.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .anyMatch(authority -> authority.equals("ROLE_ADMIN"));
        return admin ? "ADMIN" : "PARTICIPANT";
    }

    private String detectModule(String path) {
        String[] segments = Arrays.stream(path.split("/"))
                .filter(segment -> !segment.isBlank())
                .toArray(String[]::new);
        int index = segments.length > 1 && "admin".equals(segments[1]) ? 2 : 1;
        String value = segments.length > index ? segments[index] : "systeme";
        return switch (value) {
            case "auth" -> "AUTHENTIFICATION";
            case "opportunites" -> "OPPORTUNITES";
            case "sondages" -> "SONDAGES";
            case "utilisateurs" -> "UTILISATEURS";
            case "wallet", "transactions" -> "FINANCES";
            case "fournisseurs" -> "FOURNISSEURS";
            case "commanditaires" -> "COMMANDITAIRES";
            case "bannieres" -> "BANNIERES";
            case "kyc" -> "KYC";
            case "stats" -> "STATISTIQUES";
            default -> value.toUpperCase(Locale.ROOT);
        };
    }

    private String detectAction(String method, String path) {
        if (path.endsWith("/connexion")) return "CONNEXION";
        if (path.endsWith("/logout")) return "DECONNEXION";
        if (path.contains("/souscrire")) return "SOUSCRIPTION";
        if (path.contains("/approuver")) return "APPROBATION";
        if (path.contains("/rejeter")) return "REJET";
        if (path.contains("/rembourser")) return "REMBOURSEMENT";
        if (path.contains("/cloturer")) return "CLOTURE";
        if (path.contains("/activer")) return "ACTIVATION";
        if (path.contains("/suspendre")) return "SUSPENSION";
        if (path.contains("/distribuer")) return "DISTRIBUTION";
        if (path.contains("/images") || path.contains("/image")) return "GESTION_IMAGE";
        return switch (method) {
            case "GET" -> "CONSULTATION";
            case "POST" -> "CREATION";
            case "PUT", "PATCH" -> "MODIFICATION";
            case "DELETE" -> "SUPPRESSION";
            default -> "ACTION";
        };
    }

    private String detectResourceId(String path) {
        return Arrays.stream(path.split("/"))
                .filter(segment -> UUID_SEGMENT.matcher(segment).matches())
                .findFirst()
                .map(segment -> truncate(segment, 100))
                .orElse(null);
    }

    private String description(String action, String module, int statusCode) {
        String result = statusCode < 400 ? "réussie" : "échouée";
        return action.replace('_', ' ').toLowerCase(Locale.ROOT) + " sur "
                + module.toLowerCase(Locale.ROOT) + " " + result + " (HTTP " + statusCode + ")";
    }

    private String correlationId(String supplied) {
        return supplied != null && SAFE_CORRELATION_ID.matcher(supplied).matches()
                ? supplied
                : UUID.randomUUID().toString();
    }

    private String clientIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        String ip = forwarded == null || forwarded.isBlank()
                ? request.getRemoteAddr()
                : forwarded.split(",", 2)[0].trim();
        return truncate(ip, 45);
    }

    private String truncate(String value, int maxLength) {
        if (value == null) return null;
        return value.length() <= maxLength ? value : value.substring(0, maxLength);
    }
}
