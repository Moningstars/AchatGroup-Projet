package com.plateformeopportunites.security;

import com.plateformeopportunites.common.event.AuditTrailEvent;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Instant;
import java.util.UUID;

@Component
public class AuditHttpFilter extends OncePerRequestFilter {
    private final ApplicationEventPublisher publisher;

    public AuditHttpFilter(ApplicationEventPublisher publisher) {
        this.publisher = publisher;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        if (!request.getRequestURI().startsWith("/api/admin/") || request.getRequestURI().startsWith("/api/admin/audit-logs")) {
            filterChain.doFilter(request, response);
            return;
        }
        long started = System.nanoTime();
        String correlationId = request.getHeader("X-Correlation-Id");
        if (correlationId == null || correlationId.isBlank()) correlationId = UUID.randomUUID().toString();
        try {
            filterChain.doFilter(request, response);
        } finally {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            String actorId = authentication != null && authentication.getName() != null ? authentication.getName() : "anonymous";
            publisher.publishEvent(new AuditTrailEvent(Instant.now(), actorId, "ADMIN",
                    request.getMethod() + " " + request.getRequestURI(), module(request.getRequestURI()),
                    request.getMethod(), request.getRequestURI(), null, null, response.getStatus(),
                    response.getStatus() < 400, request.getRemoteAddr(), request.getHeader("User-Agent"),
                    correlationId, (System.nanoTime() - started) / 1_000_000, null));
        }
    }

    private String module(String path) {
        String[] parts = path.split("/");
        return parts.length > 3 && !parts[3].isBlank() ? parts[3] : "admin";
    }
}
