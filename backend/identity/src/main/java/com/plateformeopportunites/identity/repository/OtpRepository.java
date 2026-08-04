package com.plateformeopportunites.identity.repository;

import com.plateformeopportunites.identity.entity.Otp;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

public interface OtpRepository extends JpaRepository<Otp, UUID> {

    Optional<Otp> findByIdentifiantAndCodeAndUtiliseFalseAndExpiresAtAfter(
            String identifiant, String code, LocalDateTime now);

    @Modifying
    @Query("DELETE FROM Otp o WHERE o.identifiant = :identifiant AND o.utilise = false")
    void supprimerNonUtilisesParIdentifiant(@Param("identifiant") String identifiant);
}
