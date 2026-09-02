package com.plateformeopportunites.identity.repository;

import com.plateformeopportunites.identity.entity.InfoPersonnelle;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.UUID;

public interface InfoPersonnelleRepository extends JpaRepository<InfoPersonnelle, UUID> {
    Optional<InfoPersonnelle> findByUtilisateurId(UUID utilisateurId);
}
