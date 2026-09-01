package com.plateformeopportunites.opportunite.controller;

import com.plateformeopportunites.opportunite.dto.CreerOpportuniteRequest;
import com.plateformeopportunites.opportunite.dto.GenererSpecsRequest;
import com.plateformeopportunites.opportunite.dto.GenererSpecsResponse;
import com.plateformeopportunites.opportunite.dto.ModifierOpportuniteRequest;
import com.plateformeopportunites.opportunite.dto.OpportuniteResponse;
import com.plateformeopportunites.opportunite.dto.ParticipantOpportuniteResponse;
import com.plateformeopportunites.opportunite.service.AiSpecService;
import com.plateformeopportunites.opportunite.service.ImageStorageService;
import com.plateformeopportunites.opportunite.service.OpportuniteService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin/opportunites")
@RequiredArgsConstructor
public class AdminOpportuniteController {

    private final OpportuniteService opportuniteService;
    private final ImageStorageService imageStorageService;
    private final AiSpecService aiSpecService;

    @GetMapping
    public ResponseEntity<List<OpportuniteResponse>> lister() {
        return ResponseEntity.ok(opportuniteService.listerToutes());
    }

    @PostMapping
    public ResponseEntity<OpportuniteResponse> creer(Authentication auth,
                                                      @Valid @RequestBody CreerOpportuniteRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(opportuniteService.creer(UUID.fromString(auth.getName()), req));
    }

    @PatchMapping("/{id}")
    public ResponseEntity<OpportuniteResponse> modifier(@PathVariable UUID id,
                                                          @Valid @RequestBody ModifierOpportuniteRequest req) {
        return ResponseEntity.ok(opportuniteService.modifier(id, req));
    }

    @PostMapping("/generer-specs")
    public ResponseEntity<GenererSpecsResponse> genererSpecs(@Valid @RequestBody GenererSpecsRequest req) {
        return ResponseEntity.ok(aiSpecService.genererSpecs(req));
    }

    @PatchMapping("/{id}/activer")
    public ResponseEntity<Void> activer(Authentication auth, @PathVariable UUID id) {
        opportuniteService.activer(UUID.fromString(auth.getName()), id);
        return ResponseEntity.ok().build();
    }

    @PatchMapping("/{id}/cloturer")
    public ResponseEntity<Void> cloturer(@PathVariable UUID id) {
        opportuniteService.cloturerAvecSucces(id);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/{id}/participants")
    public ResponseEntity<List<ParticipantOpportuniteResponse>> listerParticipants(@PathVariable UUID id) {
        return ResponseEntity.ok(opportuniteService.listerParticipants(id));
    }

    // ── Image management ────────────────────────────────────────────────────

    @PostMapping(value = "/{id}/images", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<OpportuniteResponse.ImageResponse> uploadImage(
            @PathVariable UUID id,
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "legende", required = false) String legende) throws IOException {
        String url = imageStorageService.stocker(file, id);
        OpportuniteResponse.ImageResponse response = opportuniteService.ajouterImage(id, url, legende);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/{id}/images")
    public ResponseEntity<List<OpportuniteResponse.ImageResponse>> listerImages(@PathVariable UUID id) {
        return ResponseEntity.ok(opportuniteService.listerImages(id));
    }

    @DeleteMapping("/{id}/images/{imageId}")
    public ResponseEntity<Void> supprimerImage(@PathVariable UUID id, @PathVariable UUID imageId) {
        opportuniteService.supprimerImage(id, imageId);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/participations/{participationId}/rembourser")
    public ResponseEntity<Void> forcerRemboursement(@PathVariable UUID participationId) {
        opportuniteService.forcerRemboursement(participationId);
        return ResponseEntity.ok().build();
    }
}
