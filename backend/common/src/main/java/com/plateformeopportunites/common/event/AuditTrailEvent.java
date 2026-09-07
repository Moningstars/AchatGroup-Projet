package com.plateformeopportunites.common.event;

import java.time.Instant;

public record AuditTrailEvent(
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
}
