package com.plateformeopportunites.finance.repository;

import com.plateformeopportunites.finance.entity.Portefeuille;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.UUID;

public interface PortefeuilleRepository extends JpaRepository<Portefeuille, UUID> {
    Optional<Portefeuille> findByUtilisateurId(UUID utilisateurId);
}
