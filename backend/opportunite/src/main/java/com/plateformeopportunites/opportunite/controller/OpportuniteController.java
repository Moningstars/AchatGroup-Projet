package com.plateformeopportunites.opportunite.controller;

import com.plateformeopportunites.opportunite.dto.ConfirmerReceptionRequest;
import com.plateformeopportunites.opportunite.dto.MaParticipationOpportuniteResponse;
import com.plateformeopportunites.opportunite.dto.OpportuniteResponse;
import com.plateformeopportunites.opportunite.service.OpportuniteService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import jakarta.validation.constraints.Min;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/opportunites")
@RequiredArgsConstructor
@Validated
@Tag(name = "Opportunités", description = "Consultation et souscription aux opportunités d'achat groupé")
public class OpportuniteController {

    private final OpportuniteService opportuniteService;

    @GetMapping
    public ResponseEntity<List<OpportuniteResponse>> lister(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) List<String> categories) {
        return ResponseEntity.ok(opportuniteService.rechercherActives(q, categories));
    }

    @GetMapping("/{id}")
    public ResponseEntity<OpportuniteResponse> getById(@PathVariable UUID id) {
        return ResponseEntity.ok(opportuniteService.getById(id));
    }

    @GetMapping("/mes-participations")
    public ResponseEntity<List<MaParticipationOpportuniteResponse>> mesParticipations(Authentication auth) {
        return ResponseEntity.ok(opportuniteService.listerMesParticipations(UUID.fromString(auth.getName())));
    }

    @PostMapping("/{id}/souscrire")
    public ResponseEntity<Void> souscrire(Authentication auth,
                                          @PathVariable UUID id,
                                          @RequestParam(defaultValue = "1") @Min(1) Integer quantite) {
        opportuniteService.souscrire(UUID.fromString(auth.getName()), id, quantite);
        return ResponseEntity.ok().build();
    }

    @PatchMapping("/mes-participations/{participationId}/reception")
    public ResponseEntity<MaParticipationOpportuniteResponse> confirmerReception(
            Authentication auth,
            @PathVariable UUID participationId,
            @RequestBody(required = false) ConfirmerReceptionRequest req) {
        ConfirmerReceptionRequest request = req != null ? req : new ConfirmerReceptionRequest();
        return ResponseEntity.ok(opportuniteService.confirmerReception(UUID.fromString(auth.getName()), participationId, request));
    }
}
