package com.plateformeopportunites.identity.controller;

import com.plateformeopportunites.identity.dto.KycRequest;
import com.plateformeopportunites.identity.dto.KycStatusResponse;
import com.plateformeopportunites.identity.service.KycService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/profil")
@RequiredArgsConstructor
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "Profil — KYC", description = "Vérification d'identité (Know Your Customer)")
public class KycController {

    private final KycService kycService;

    @Operation(summary = "Voir mon statut de vérification")
    @GetMapping("/kyc")
    public ResponseEntity<KycStatusResponse> getStatut(Authentication auth) {
        UUID userId = UUID.fromString(auth.getName());
        return ResponseEntity.ok(kycService.getStatut(userId));
    }

    @Operation(
        summary = "Soumettre une demande de vérification d'identité",
        description = "Enregistre les informations personnelles et passe le niveau à EN_ATTENTE."
    )
    @PostMapping("/kyc")
    public ResponseEntity<KycStatusResponse> soumettre(
            Authentication auth,
            @Valid @RequestBody KycRequest req) {
        UUID userId = UUID.fromString(auth.getName());
        return ResponseEntity.ok(kycService.soumettre(userId, req));
    }
}
