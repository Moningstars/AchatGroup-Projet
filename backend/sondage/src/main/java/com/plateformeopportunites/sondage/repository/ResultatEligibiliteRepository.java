package com.plateformeopportunites.sondage.repository;

import com.plateformeopportunites.sondage.entity.ResultatEligibilite;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.UUID;

public interface ResultatEligibiliteRepository extends JpaRepository<ResultatEligibilite, UUID> {
    Optional<ResultatEligibilite> findByUtilisateurIdAndSondageEligibilite_Sondage_Id(UUID utilisateurId, UUID sondageId);
    boolean existsByUtilisateurIdAndSondageEligibilite_Sondage_Id(UUID utilisateurId, UUID sondageId);
}
