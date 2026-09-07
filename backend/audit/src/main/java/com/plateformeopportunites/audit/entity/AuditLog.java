package com.plateformeopportunites.audit.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "audit_logs", indexes = {
        @Index(name = "idx_audit_occurred_at", columnList = "occurred_at"),
        @Index(name = "idx_audit_actor_id", columnList = "actor_id"),
        @Index(name = "idx_audit_module", columnList = "module"),
        @Index(name = "idx_audit_action", columnList = "action")
})
@Getter
@Builder
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
public class AuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "occurred_at", nullable = false, updatable = false)
    private Instant occurredAt;

    @Column(name = "actor_id", nullable = false, updatable = false, length = 100)
    private String actorId;

    @Column(name = "actor_type", nullable = false, updatable = false, length = 30)
    private String actorType;

    @Column(nullable = false, updatable = false, length = 80)
    private String action;

    @Column(nullable = false, updatable = false, length = 60)
    private String module;

    @Column(name = "http_method", nullable = false, updatable = false, length = 10)
    private String httpMethod;

    @Column(nullable = false, updatable = false, length = 500)
    private String path;

    @Column(name = "resource_type", updatable = false, length = 80)
    private String resourceType;

    @Column(name = "resource_id", updatable = false, length = 100)
    private String resourceId;

    @Column(name = "status_code", nullable = false, updatable = false)
    private Integer statusCode;

    @Column(nullable = false, updatable = false)
    private Boolean success;

    @Column(name = "ip_address", updatable = false, length = 45)
    private String ipAddress;

    @Column(name = "user_agent", updatable = false, length = 500)
    private String userAgent;

    @Column(name = "correlation_id", nullable = false, updatable = false, length = 100)
    private String correlationId;

    @Column(name = "duration_ms", nullable = false, updatable = false)
    private Long durationMs;

    @Column(updatable = false, length = 500)
    private String description;
}
