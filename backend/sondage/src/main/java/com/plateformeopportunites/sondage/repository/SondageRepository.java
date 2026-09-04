package com.plateformeopportunites.sondage.repository;

import com.plateformeopportunites.common.enums.StatutSondage;
import com.plateformeopportunites.sondage.entity.Sondage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import jakarta.persistence.LockModeType;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface SondageRepository extends JpaRepository<Sondage, UUID> {
    List<Sondage> findByStatut(StatutSondage statut);
    long countByStatut(StatutSondage statut);
    List<Sondage> findByStatutAndDateExpirationBefore(StatutSondage statut, LocalDateTime date);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT s FROM Sondage s WHERE s.id = :id")
    Optional<Sondage> findByIdForUpdate(@Param("id") UUID id);
}
