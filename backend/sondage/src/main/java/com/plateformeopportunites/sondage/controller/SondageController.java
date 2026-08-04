package com.plateformeopportunites.sondage.controller;

import com.plateformeopportunites.sondage.dto.EligibiliteQuestionsResponse;
import com.plateformeopportunites.sondage.dto.EligibiliteRequest;
import com.plateformeopportunites.sondage.dto.MaParticipationSondageResponse;
import com.plateformeopportunites.sondage.dto.MonEligibiliteResponse;
import com.plateformeopportunites.sondage.dto.RepondreRequest;
import com.plateformeopportunites.sondage.dto.SondageResponse;
import com.plateformeopportunites.sondage.service.PreuveStorageService;
import com.plateformeopportunites.sondage.service.SondageService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/sondages")
@RequiredArgsConstructor
@io.swagger.v3.oas.annotations.tags.Tag(name = "Sondages", description = "Éligibilité et participation aux sondages rémunérés")
public class SondageController {

    private final SondageService sondageService;
    private final PreuveStorageService preuveStorageService;

    @GetMapping
    public ResponseEntity<List<SondageResponse>> lister() {
        return ResponseEntity.ok(sondageService.listerActifs());
    }

    @GetMapping("/{id}")
    public ResponseEntity<SondageResponse> getById(@PathVariable UUID id) {
        return ResponseEntity.ok(sondageService.getById(id));
    }

    @GetMapping("/mes-participations")
    public ResponseEntity<List<MaParticipationSondageResponse>> mesParticipations(Authentication auth) {
        return ResponseEntity.ok(sondageService.listerMesParticipations(UUID.fromString(auth.getName())));
    }

    @GetMapping("/{id}/eligibilite")
    public ResponseEntity<EligibiliteQuestionsResponse> getEligibiliteQuestions(@PathVariable UUID id) {
        try {
            return ResponseEntity.ok(sondageService.getEligibiliteQuestions(id));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @GetMapping("/{id}/mon-eligibilite")
    public ResponseEntity<MonEligibiliteResponse> getMonEligibilite(Authentication auth,
                                                                     @PathVariable UUID id) {
        return ResponseEntity.ok(sondageService.getMonEligibilite(UUID.fromString(auth.getName()), id));
    }

    @PostMapping("/{id}/eligibilite")
    public ResponseEntity<Void> passerEligibilite(Authentication auth,
                                                   @PathVariable UUID id,
                                                   @Valid @RequestBody EligibiliteRequest req) {
        sondageService.passerEligibilite(UUID.fromString(auth.getName()), id, req);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/{id}/repondre")
    public ResponseEntity<Void> repondre(Authentication auth,
                                         @PathVariable UUID id,
                                         @Valid @RequestBody RepondreRequest req) {
        sondageService.repondre(UUID.fromString(auth.getName()), id, req);
        return ResponseEntity.ok().build();
    }

    @PostMapping(value = "/{id}/reponse/preuve", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Void> soumettrePreuve(Authentication auth,
                                                @PathVariable UUID id,
                                                @RequestParam("file") MultipartFile file) throws IOException {
        String url = preuveStorageService.stocker(file, id);
        sondageService.soumettrePreuve(UUID.fromString(auth.getName()), id, url);
        return ResponseEntity.ok().build();
    }
}
