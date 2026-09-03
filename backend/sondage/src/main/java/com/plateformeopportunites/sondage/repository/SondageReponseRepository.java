package com.plateformeopportunites.sondage.repository;

import com.plateformeopportunites.common.enums.StatutValidation;
import com.plateformeopportunites.sondage.entity.SondageReponse;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface SondageReponseRepository extends JpaRepository<SondageReponse, UUID> {
    Optional<SondageReponse> findBySondageIdAndUtilisateurId(UUID sondageId, UUID utilisateurId);
    boolean existsBySondageIdAndUtilisateurId(UUID sondageId, UUID utilisateurId);
    List<SondageReponse> findByUtilisateurId(UUID utilisateurId);
    List<SondageReponse> findBySondageIdOrderByCreatedAtDesc(UUID sondageId);
    long countBySondageId(UUID sondageId);
    long countBySondageIdAndStatutValidation(UUID sondageId, StatutValidation statut);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT r FROM SondageReponse r JOIN FETCH r.sondage WHERE r.id = :id")
    Optional<SondageReponse> findByIdForUpdate(@Param("id") UUID id);

    @Query("SELECT r FROM SondageReponse r JOIN FETCH r.sondage WHERE r.utilisateur.id = :userId ORDER BY r.createdAt DESC")
    List<SondageReponse> findByUtilisateurIdWithSondage(@Param("userId") UUID userId);
    List<SondageReponse> findBySondageIdAndStatutValidation(UUID sondageId, StatutValidation statut);
    List<SondageReponse> findBySondageIdAndRecompenseVersee(UUID sondageId, Boolean recompenseVersee);
    List<SondageReponse> findBySondageIdAndStatutValidationAndRecompenseVersee(UUID sondageId, StatutValidation statut, Boolean recompenseVersee);

    @Query("SELECT DISTINCT r FROM SondageReponse r " +
           "LEFT JOIN FETCH r.details d " +
           "LEFT JOIN FETCH d.question " +
           "LEFT JOIN FETCH d.optionReponse " +
           "WHERE r.sondage.id = :sondageId AND r.statutValidation = :statut")
    List<SondageReponse> findBySondageIdAndStatutValidationWithDetails(
            @Param("sondageId") UUID sondageId, @Param("statut") StatutValidation statut);
}
