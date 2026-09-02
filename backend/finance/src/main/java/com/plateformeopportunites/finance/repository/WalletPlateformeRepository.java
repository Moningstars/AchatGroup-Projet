package com.plateformeopportunites.finance.repository;

import com.plateformeopportunites.finance.entity.WalletPlateforme;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;

public interface WalletPlateformeRepository extends JpaRepository<WalletPlateforme, UUID> {
}
