package com.plateformeopportunites.identity.repository;

import com.plateformeopportunites.identity.entity.Fournisseur;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;

public interface FournisseurRepository extends JpaRepository<Fournisseur, UUID> {
    boolean existsByEmail(String email);
}
