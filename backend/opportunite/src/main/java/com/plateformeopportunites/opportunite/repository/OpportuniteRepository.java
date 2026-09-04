package com.plateformeopportunites.opportunite.repository;

import com.plateformeopportunites.common.enums.StatutOpportunite;
import com.plateformeopportunites.opportunite.entity.Opportunite;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public interface OpportuniteRepository extends JpaRepository<Opportunite, UUID> {
    List<Opportunite> findByStatut(StatutOpportunite statut);
    long countByStatut(StatutOpportunite statut);
    List<Opportunite> findByStatutAndDateExpirationBefore(StatutOpportunite statut, LocalDateTime date);
    List<Opportunite> findByStatutAndDateExpirationBetween(StatutOpportunite statut, LocalDateTime debut, LocalDateTime fin);

    @Query("""
            SELECT DISTINCT o
            FROM Opportunite o
            LEFT JOIN o.categorie c
            WHERE o.statut = :statut
              AND (:q IS NULL OR :q = ''
                   OR LOWER(o.titre) LIKE LOWER(CONCAT('%', :q, '%'))
                   OR LOWER(COALESCE(o.description, '')) LIKE LOWER(CONCAT('%', :q, '%'))
                   OR LOWER(COALESCE(o.specsPointsForts, '')) LIKE LOWER(CONCAT('%', :q, '%'))
                   OR LOWER(COALESCE(c.nom, '')) LIKE LOWER(CONCAT('%', :q, '%')))
              AND (:categoriesEmpty = true OR c.nom IN :categories)
            ORDER BY o.createdAt DESC
            """)
    List<Opportunite> rechercherActives(
            @Param("statut") StatutOpportunite statut,
            @Param("q") String q,
            @Param("categories") List<String> categories,
            @Param("categoriesEmpty") boolean categoriesEmpty
    );
}
