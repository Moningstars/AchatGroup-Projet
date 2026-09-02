package com.plateformeopportunites.opportunite.repository;

import com.plateformeopportunites.common.enums.StatutOpportunite;
import com.plateformeopportunites.opportunite.entity.Opportunite;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public interface OpportuniteRepository extends JpaRepository<Opportunite, UUID> {
    List<Opportunite> findByStatut(StatutOpportunite statut);
    long countByStatut(StatutOpportunite statut);
    List<Opportunite> findByStatutAndDateExpirationBefore(StatutOpportunite statut, LocalDateTime date);
    List<Opportunite> findByStatutAndDateExpirationBetween(StatutOpportunite statut, LocalDateTime debut, LocalDateTime fin);
}
