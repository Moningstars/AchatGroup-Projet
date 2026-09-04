package com.plateformeopportunites.common.controller;

import com.plateformeopportunites.common.dto.StatsResponse;
import com.plateformeopportunites.common.enums.StatutOpportunite;
import com.plateformeopportunites.common.enums.StatutSondage;
import com.plateformeopportunites.identity.repository.UtilisateurRepository;
import com.plateformeopportunites.opportunite.repository.OpportuniteRepository;
import com.plateformeopportunites.sondage.repository.SondageRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/stats")
@RequiredArgsConstructor
public class StatsController {

    private final UtilisateurRepository utilisateurRepository;
    private final OpportuniteRepository opportuniteRepository;
    private final SondageRepository sondageRepository;

    @GetMapping
    public ResponseEntity<StatsResponse> getStats() {
        return ResponseEntity.ok(StatsResponse.builder()
                .membresActifs(utilisateurRepository.count())
                .achatsGroupes(opportuniteRepository.countByStatut(StatutOpportunite.CLOTUREE))
                .sondagesActifs(sondageRepository.countByStatut(StatutSondage.ACTIF))
                .build());
    }
}
