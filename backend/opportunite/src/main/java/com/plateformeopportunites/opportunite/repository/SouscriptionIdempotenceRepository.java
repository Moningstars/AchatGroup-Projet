package com.plateformeopportunites.opportunite.repository;

import com.plateformeopportunites.opportunite.entity.SouscriptionIdempotence;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface SouscriptionIdempotenceRepository extends JpaRepository<SouscriptionIdempotence, UUID> {
}
