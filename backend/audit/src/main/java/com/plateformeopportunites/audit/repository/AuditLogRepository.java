package com.plateformeopportunites.audit.repository;

import com.plateformeopportunites.audit.entity.AuditLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.Collection;
import java.util.UUID;

public interface AuditLogRepository extends JpaRepository<AuditLog, UUID>, JpaSpecificationExecutor<AuditLog> {

    long countBySuccessFalse();

    long countByOccurredAtAfter(Instant since);

    @Query("select count(a) from AuditLog a where a.httpMethod in :methods")
    long countWriteActions(@Param("methods") Collection<String> methods);
}
