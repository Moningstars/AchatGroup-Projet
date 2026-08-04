package com.plateformeopportunites.identity.repository;

import com.plateformeopportunites.common.enums.NiveauVerification;
import com.plateformeopportunites.identity.entity.Utilisateur;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface UtilisateurRepository extends JpaRepository<Utilisateur, UUID> {
    Optional<Utilisateur> findByTelephone(String telephone);
    boolean existsByTelephone(String telephone);
    List<Utilisateur> findByNiveauVerification(NiveauVerification niveauVerification);
}
