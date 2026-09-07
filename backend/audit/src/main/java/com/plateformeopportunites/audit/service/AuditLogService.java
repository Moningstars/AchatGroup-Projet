package com.plateformeopportunites.audit.service;

import com.plateformeopportunites.audit.dto.AuditLogResponse;
import com.plateformeopportunites.audit.dto.AuditStatsResponse;
import com.plateformeopportunites.audit.entity.AuditLog;
import com.plateformeopportunites.audit.repository.AuditLogRepository;
import com.plateformeopportunites.common.event.AuditTrailEvent;
import lombok.RequiredArgsConstructor;
import org.springframework.context.event.EventListener;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;

@Service
@RequiredArgsConstructor
public class AuditLogService {

    private static final List<String> WRITE_METHODS = List.of("POST", "PUT", "PATCH", "DELETE");
    private final AuditLogRepository repository;

    @EventListener
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void record(AuditTrailEvent event) {
        repository.save(AuditLog.builder()
                .occurredAt(event.occurredAt())
                .actorId(event.actorId())
                .actorType(event.actorType())
                .action(event.action())
                .module(event.module())
                .httpMethod(event.httpMethod())
                .path(event.path())
                .resourceType(event.resourceType())
                .resourceId(event.resourceId())
                .statusCode(event.statusCode())
                .success(event.success())
                .ipAddress(event.ipAddress())
                .userAgent(event.userAgent())
                .correlationId(event.correlationId())
                .durationMs(event.durationMs())
                .description(event.description())
                .build());
    }

    @Transactional(readOnly = true)
    public Page<AuditLogResponse> search(String search, String module, String action, Boolean success,
                                         Instant from, Instant to, int page, int size) {
        Specification<AuditLog> specification = Specification.where(null);

        if (search != null && !search.isBlank()) {
            String term = "%" + search.trim().toLowerCase() + "%";
            specification = specification.and((root, query, cb) -> cb.or(
                    cb.like(cb.lower(root.get("actorId")), term),
                    cb.like(cb.lower(root.get("path")), term),
                    cb.like(cb.lower(root.get("description")), term),
                    cb.like(cb.lower(root.get("resourceId")), term),
                    cb.like(cb.lower(root.get("correlationId")), term)
            ));
        }
        if (module != null && !module.isBlank()) {
            specification = specification.and((root, query, cb) -> cb.equal(root.get("module"), module));
        }
        if (action != null && !action.isBlank()) {
            specification = specification.and((root, query, cb) -> cb.equal(root.get("action"), action));
        }
        if (success != null) {
            specification = specification.and((root, query, cb) -> cb.equal(root.get("success"), success));
        }
        if (from != null) {
            specification = specification.and((root, query, cb) -> cb.greaterThanOrEqualTo(root.get("occurredAt"), from));
        }
        if (to != null) {
            specification = specification.and((root, query, cb) -> cb.lessThanOrEqualTo(root.get("occurredAt"), to));
        }

        PageRequest pageable = PageRequest.of(
                Math.max(page, 0), Math.min(Math.max(size, 1), 100),
                Sort.by(Sort.Direction.DESC, "occurredAt")
        );
        return repository.findAll(specification, pageable).map(AuditLogResponse::from);
    }

    @Transactional(readOnly = true)
    public AuditStatsResponse stats() {
        return new AuditStatsResponse(
                repository.count(),
                repository.countByOccurredAtAfter(Instant.now().minus(24, ChronoUnit.HOURS)),
                repository.countBySuccessFalse(),
                repository.countWriteActions(WRITE_METHODS)
        );
    }
}
