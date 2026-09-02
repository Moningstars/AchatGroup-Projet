package com.plateformeopportunites.finance.repository;

import com.plateformeopportunites.finance.entity.PaiementPaygate;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface PaiementPaygateRepository extends JpaRepository<PaiementPaygate, UUID> {
    Optional<PaiementPaygate> findByIdentifier(String identifier);
}
