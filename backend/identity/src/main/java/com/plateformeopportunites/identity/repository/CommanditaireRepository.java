package com.plateformeopportunites.identity.repository;

import com.plateformeopportunites.identity.entity.Commanditaire;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.UUID;

public interface CommanditaireRepository extends JpaRepository<Commanditaire, UUID> {
    Optional<Commanditaire> findByEmail(String email);
    boolean existsByEmail(String email);
}
