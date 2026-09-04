package com.plateformeopportunites.opportunite.repository;

import com.plateformeopportunites.opportunite.entity.OpportuniteImage;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface OpportuniteImageRepository extends JpaRepository<OpportuniteImage, UUID> {
    List<OpportuniteImage> findByOpportuniteIdOrderByOrdre(UUID opportuniteId);
    long countByOpportuniteId(UUID opportuniteId);
}
