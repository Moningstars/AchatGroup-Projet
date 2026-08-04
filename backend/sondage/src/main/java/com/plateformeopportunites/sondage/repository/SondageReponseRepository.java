package com.plateformeopportunites.sondage.repository;

import com.plateformeopportunites.common.enums.StatutValidation;
import com.plateformeopportunites.sondage.entity.SondageReponse;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface SondageReponseRepository extends JpaRepository<SondageReponse, UUID> {
    Optional<SondageReponse> findBySondageIdAndUtilisateurId(UUID sondageId, UUID utilisateurId);
    boolean existsBySondageIdAndUtilisateurId(UUID sondageId, UUID utilisateurId);
    List<SondageReponse> findByUtilisateurId(UUID utilisateurId);

    @Query("SELECT r FROM SondageReponse r JOIN FETCH r.sondage WHERE r.utilisateur.id = :userId ORDER BY r.createdAt DESC")
    List<SondageReponse> findByUtilisateurIdWithSondage(@Param("userId") UUID userId);
    List<SondageReponse> findBySondageIdAndStatutValidation(UUID sondageId, StatutValidation statut);
    List<SondageReponse> findBySondageIdAndRecompenseVersee(UUID sondageId, Boolean recompenseVersee);
    List<SondageReponse> findBySondageIdAndStatutValidationAndRecompenseVersee(UUID sondageId, StatutValidation statut, Boolean recompenseVersee);
}
