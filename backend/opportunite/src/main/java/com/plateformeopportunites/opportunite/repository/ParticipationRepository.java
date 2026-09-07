package com.plateformeopportunites.opportunite.repository;

import com.plateformeopportunites.common.enums.StatutParticipation;
import com.plateformeopportunites.opportunite.entity.Participation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.Lock;
import jakarta.persistence.LockModeType;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.time.LocalDateTime;

public interface ParticipationRepository extends JpaRepository<Participation, UUID> {
    List<Participation> findByUtilisateurId(UUID utilisateurId);

    @Query("SELECT p FROM Participation p JOIN FETCH p.opportunite o LEFT JOIN FETCH o.categorie WHERE p.utilisateur.id = :userId ORDER BY p.createdAt DESC")
    List<Participation> findByUtilisateurIdFetch(@Param("userId") UUID userId);
    List<Participation> findByOpportuniteId(UUID opportuniteId);
    List<Participation> findByOpportuniteIdOrderByQuantiteDescMontantGeleDescCreatedAtDesc(UUID opportuniteId);
    List<Participation> findByOpportuniteIdAndStatut(UUID opportuniteId, StatutParticipation statut);
    List<Participation> findByStatutLivraisonAndDateLivraisonPrevueLessThanEqual(
            com.plateformeopportunites.common.enums.StatutLivraison statutLivraison,
            LocalDateTime dateLivraisonPrevue);
    Optional<Participation> findByUtilisateurIdAndOpportuniteId(UUID utilisateurId, UUID opportuniteId);
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT p FROM Participation p WHERE p.utilisateur.id = :utilisateurId AND p.opportunite.id = :opportuniteId")
    Optional<Participation> findByUtilisateurIdAndOpportuniteIdForUpdate(
            @Param("utilisateurId") UUID utilisateurId, @Param("opportuniteId") UUID opportuniteId);
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT p FROM Participation p WHERE p.id = :id")
    Optional<Participation> findByIdForUpdate(@Param("id") UUID id);

    boolean existsByUtilisateurIdAndOpportuniteId(UUID utilisateurId, UUID opportuniteId);
}
