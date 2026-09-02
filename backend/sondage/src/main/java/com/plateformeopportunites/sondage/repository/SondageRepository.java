package com.plateformeopportunites.sondage.repository;

import com.plateformeopportunites.common.enums.StatutSondage;
import com.plateformeopportunites.sondage.entity.Sondage;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public interface SondageRepository extends JpaRepository<Sondage, UUID> {
    List<Sondage> findByStatut(StatutSondage statut);
    long countByStatut(StatutSondage statut);
    List<Sondage> findByStatutAndDateExpirationBefore(StatutSondage statut, LocalDateTime date);
}
