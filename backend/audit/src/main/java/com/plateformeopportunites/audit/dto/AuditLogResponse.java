package com.plateformeopportunites.audit.dto;

import com.plateformeopportunites.audit.entity.AuditLog;

import java.time.Instant;
import java.util.UUID;

public record AuditLogResponse(
        UUID id,
        Instant occurredAt,
        String actorId,
        String actorType,
        String action,
        String module,
        String httpMethod,
        String path,
        String resourceType,
        String resourceId,
        int statusCode,
        boolean success,
        String ipAddress,
        String userAgent,
        String correlationId,
        long durationMs,
        String description
) {
    public static AuditLogResponse from(AuditLog log) {
        return new AuditLogResponse(
                log.getId(), log.getOccurredAt(), log.getActorId(), log.getActorType(),
                log.getAction(), log.getModule(), log.getHttpMethod(), log.getPath(),
                log.getResourceType(), log.getResourceId(), log.getStatusCode(),
                log.getSuccess(), log.getIpAddress(), log.getUserAgent(),
                log.getCorrelationId(), log.getDurationMs(), log.getDescription()
        );
    }
}
