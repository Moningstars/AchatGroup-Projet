package com.plateformeopportunites.identity.repository;

import com.plateformeopportunites.identity.entity.Administrateur;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.UUID;

public interface AdministrateurRepository extends JpaRepository<Administrateur, UUID> {
    Optional<Administrateur> findByEmail(String email);
    boolean existsByEmail(String email);
}
