package com.plateformeopportunites.opportunite.repository;

import com.plateformeopportunites.opportunite.entity.PalierPrix;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface PalierPrixRepository extends JpaRepository<PalierPrix, UUID> {
    List<PalierPrix> findByOpportuniteIdOrderBySeuilMin(UUID opportuniteId);
}
