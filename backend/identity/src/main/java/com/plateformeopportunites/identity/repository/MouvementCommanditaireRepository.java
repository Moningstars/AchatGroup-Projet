package com.plateformeopportunites.identity.repository;

import com.plateformeopportunites.identity.entity.MouvementCommanditaire;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface MouvementCommanditaireRepository extends JpaRepository<MouvementCommanditaire, UUID> {
    List<MouvementCommanditaire> findTop50ByCommanditaireIdOrderByCreatedAtDesc(UUID commanditaireId);
}
