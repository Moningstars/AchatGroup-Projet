package com.plateformeopportunites.finance.repository;

import com.plateformeopportunites.finance.entity.TransactionPlateforme;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface TransactionPlateformeRepository extends JpaRepository<TransactionPlateforme, UUID> {
    List<TransactionPlateforme> findBySondageIdOrderByCreatedAtDesc(UUID sondageId);
}
