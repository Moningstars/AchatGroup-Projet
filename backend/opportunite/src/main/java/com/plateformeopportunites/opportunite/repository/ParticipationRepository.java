package com.plateformeopportunites.opportunite.repository;

import com.plateformeopportunites.common.enums.StatutParticipation;
import com.plateformeopportunites.opportunite.entity.Participation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ParticipationRepository extends JpaRepository<Participation, UUID> {
    List<Participation> findByUtilisateurId(UUID utilisateurId);

    @Query("SELECT p FROM Participation p JOIN FETCH p.opportunite o LEFT JOIN FETCH o.categorie WHERE p.utilisateur.id = :userId ORDER BY p.createdAt DESC")
    List<Participation> findByUtilisateurIdFetch(@Param("userId") UUID userId);
    List<Participation> findByOpportuniteId(UUID opportuniteId);
    List<Participation> findByOpportuniteIdOrderByQuantiteDescMontantGeleDescCreatedAtDesc(UUID opportuniteId);
    List<Participation> findByOpportuniteIdAndStatut(UUID opportuniteId, StatutParticipation statut);
    Optional<Participation> findByUtilisateurIdAndOpportuniteId(UUID utilisateurId, UUID opportuniteId);
    boolean existsByUtilisateurIdAndOpportuniteId(UUID utilisateurId, UUID opportuniteId);
}
