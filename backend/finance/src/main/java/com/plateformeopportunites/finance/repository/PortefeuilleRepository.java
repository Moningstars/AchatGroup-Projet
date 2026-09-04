package com.plateformeopportunites.finance.repository;

import com.plateformeopportunites.finance.entity.Portefeuille;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import jakarta.persistence.LockModeType;
import java.util.Optional;
import java.util.UUID;

public interface PortefeuilleRepository extends JpaRepository<Portefeuille, UUID> {
    Optional<Portefeuille> findByUtilisateurId(UUID utilisateurId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT p FROM Portefeuille p WHERE p.utilisateur.id = :utilisateurId")
    Optional<Portefeuille> findByUtilisateurIdForUpdate(@Param("utilisateurId") UUID utilisateurId);
}
