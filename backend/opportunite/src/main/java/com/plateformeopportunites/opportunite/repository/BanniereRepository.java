package com.plateformeopportunites.opportunite.repository;

import com.plateformeopportunites.common.enums.PageCible;
import com.plateformeopportunites.opportunite.entity.Banniere;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public interface BanniereRepository extends JpaRepository<Banniere, UUID> {

    List<Banniere> findAllByOrderByOrdreAsc();

    @Query("""
        SELECT b FROM Banniere b
        WHERE b.actif = true
          AND (b.pageCible = :page OR b.pageCible = 'TOUTES')
          AND (b.dateDebut IS NULL OR b.dateDebut <= :now)
          AND (b.dateFin   IS NULL OR b.dateFin   >= :now)
        ORDER BY b.ordre ASC
    """)
    List<Banniere> findActives(@Param("page") PageCible page, @Param("now") LocalDateTime now);
}
