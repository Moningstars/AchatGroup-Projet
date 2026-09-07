package com.plateformeopportunites.common.event;

import java.time.Instant;

/**
 * Contrat transversal d'audit. Il ne contient volontairement ni corps HTTP,
 * ni jeton, ni mot de passe, afin d'éviter toute persistance de données sensibles.
 */
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
