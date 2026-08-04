package com.plateformeopportunites.opportunite.controller;

import com.plateformeopportunites.opportunite.dto.MaParticipationOpportuniteResponse;
import com.plateformeopportunites.opportunite.dto.OpportuniteResponse;
import com.plateformeopportunites.opportunite.service.OpportuniteService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/opportunites")
@RequiredArgsConstructor
@Tag(name = "Opportunités", description = "Consultation et souscription aux opportunités d'achat groupé")
public class OpportuniteController {

    private final OpportuniteService opportuniteService;

    @GetMapping
    public ResponseEntity<List<OpportuniteResponse>> lister() {
        return ResponseEntity.ok(opportuniteService.listerActives());
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
                                          @RequestParam(defaultValue = "1") Integer quantite) {
        opportuniteService.souscrire(UUID.fromString(auth.getName()), id, quantite);
        return ResponseEntity.ok().build();
    }
}
