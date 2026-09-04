package com.plateformeopportunites.identity.controller;

import com.plateformeopportunites.identity.dto.KycDemandeResponse;
import com.plateformeopportunites.identity.service.KycService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin/kyc")
@RequiredArgsConstructor
@Tag(name = "Admin — KYC", description = "Gestion des demandes de vérification d'identité")
public class AdminKycController {

    private final KycService kycService;

    @Operation(summary = "Lister les demandes KYC en attente d'approbation")
    @GetMapping("/en-attente")
    public ResponseEntity<List<KycDemandeResponse>> listerEnAttente() {
        return ResponseEntity.ok(kycService.listerEnAttente());
    }

    @Operation(summary = "Voir le dossier KYC d'un utilisateur")
    @GetMapping("/{userId}")
    public ResponseEntity<KycDemandeResponse> detail(@PathVariable UUID userId) {
        return ResponseEntity.ok(kycService.getDemandeDetail(userId));
    }

    @Operation(
        summary = "Approuver la vérification d'identité",
        description = "Passe le niveau à VERIFIE. L'utilisateur peut désormais effectuer des retraits."
    )
    @PostMapping("/{userId}/approuver")
    public ResponseEntity<Void> approuver(@PathVariable UUID userId) {
        kycService.approuver(userId);
        return ResponseEntity.ok().build();
    }

    @Operation(
        summary = "Rejeter la demande de vérification",
        description = "Passe le niveau à REJETE. L'utilisateur peut soumettre une nouvelle demande."
    )
    @PostMapping("/{userId}/rejeter")
    public ResponseEntity<Void> rejeter(@PathVariable UUID userId) {
        kycService.rejeter(userId);
        return ResponseEntity.ok().build();
    }
}
