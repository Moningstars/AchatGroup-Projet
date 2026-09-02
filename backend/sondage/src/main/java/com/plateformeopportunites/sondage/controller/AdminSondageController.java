package com.plateformeopportunites.sondage.controller;

import com.plateformeopportunites.sondage.dto.CreerEligibiliteRequest;
import com.plateformeopportunites.sondage.dto.CreerSondageRequest;
import com.plateformeopportunites.sondage.dto.ModifierSondageRequest;
import com.plateformeopportunites.sondage.dto.ReponseAValiderDTO;
import com.plateformeopportunites.sondage.dto.SondageResponse;
import com.plateformeopportunites.sondage.dto.SondageResultatDTO;
import com.plateformeopportunites.sondage.service.SondageService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin/sondages")
@RequiredArgsConstructor
@io.swagger.v3.oas.annotations.tags.Tag(name = "Admin — Sondages", description = "Création, validation et distribution des sondages (admin)")
public class AdminSondageController {

    private final SondageService sondageService;

    @GetMapping
    public ResponseEntity<List<SondageResponse>> lister() {
        return ResponseEntity.ok(sondageService.listerTous());
    }

    @PostMapping
    public ResponseEntity<SondageResponse> creer(Authentication auth,
                                                  @Valid @RequestBody CreerSondageRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(sondageService.creer(UUID.fromString(auth.getName()), req));
    }

    @PatchMapping("/{id}/activer")
    public ResponseEntity<Void> activer(@PathVariable UUID id) {
        sondageService.activer(id);
        return ResponseEntity.ok().build();
    }

    @PatchMapping("/reponses/{reponseId}/valider")
    public ResponseEntity<Void> validerPreuve(@PathVariable UUID reponseId,
                                               @RequestParam boolean approuve) {
        sondageService.validerPreuve(reponseId, approuve);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/{id}/distribuer")
    public ResponseEntity<Void> distribuerManuel(@PathVariable UUID id) {
        sondageService.distribuerManuel(id);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/{id}/eligibilite")
    public ResponseEntity<Void> creerEligibilite(@PathVariable UUID id,
                                                  @Valid @RequestBody CreerEligibiliteRequest req) {
        sondageService.creerEligibilite(id, req);
        return ResponseEntity.status(HttpStatus.CREATED).build();
    }

    @GetMapping("/{id}/reponses/a-valider")
    public ResponseEntity<List<ReponseAValiderDTO>> reponsesAValider(@PathVariable UUID id) {
        return ResponseEntity.ok(sondageService.listerReponsesAValider(id));
    }

    @GetMapping("/{id}/repondants")
    public ResponseEntity<List<ReponseAValiderDTO>> repondants(@PathVariable UUID id) {
        return ResponseEntity.ok(sondageService.listerRepondants(id));
    }

    @GetMapping("/{id}/resultats")
    public ResponseEntity<SondageResultatDTO> resultats(@PathVariable UUID id) {
        return ResponseEntity.ok(sondageService.genererResultats(id));
    }

    @PatchMapping("/{id}/cloturer")
    public ResponseEntity<Void> cloturer(@PathVariable UUID id) {
        sondageService.cloturerManuellement(id);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> supprimer(@PathVariable UUID id) {
        sondageService.supprimer(id);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}")
    public ResponseEntity<SondageResponse> modifier(@PathVariable UUID id,
                                                     @RequestBody ModifierSondageRequest req) {
        return ResponseEntity.ok(sondageService.modifier(id, req));
    }
}
