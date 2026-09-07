package com.plateformeopportunites.audit.dto;

public record AuditStatsResponse(long total, long last24Hours, long failures, long writeActions) {
}
