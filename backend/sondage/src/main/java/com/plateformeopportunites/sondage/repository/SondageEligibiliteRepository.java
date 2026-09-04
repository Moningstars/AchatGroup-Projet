package com.plateformeopportunites.sondage.repository;

import com.plateformeopportunites.sondage.entity.SondageEligibilite;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.UUID;

public interface SondageEligibiliteRepository extends JpaRepository<SondageEligibilite, UUID> {
    Optional<SondageEligibilite> findBySondageId(UUID sondageId);
    boolean existsBySondageId(UUID sondageId);
}
