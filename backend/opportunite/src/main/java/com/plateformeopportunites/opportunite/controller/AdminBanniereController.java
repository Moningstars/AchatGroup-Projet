package com.plateformeopportunites.opportunite.controller;

import com.plateformeopportunites.common.enums.PageCible;
import com.plateformeopportunites.opportunite.dto.BanniereResponse;
import com.plateformeopportunites.opportunite.service.BanniereService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin/bannieres")
@RequiredArgsConstructor
public class AdminBanniereController {

    private final BanniereService banniereService;

    @GetMapping
    public List<BanniereResponse> getAll() {
        return banniereService.getAll();
    }

    @PostMapping(consumes = "multipart/form-data")
    public ResponseEntity<BanniereResponse> creer(
            @RequestPart("image") MultipartFile image,
            @RequestPart("titre") String titre,
            @RequestPart(value = "description", required = false) String description,
            @RequestPart(value = "tag", required = false) String tag,
            @RequestPart(value = "icone", required = false) String icone,
            @RequestPart("pageCible") String pageCible,
            @RequestPart(value = "lien", required = false) String lien,
            @RequestPart(value = "ordre", required = false) String ordre,
            @RequestPart(value = "dateDebut", required = false) String dateDebut,
            @RequestPart(value = "dateFin", required = false) String dateFin
    ) throws IOException {
        BanniereResponse resp = banniereService.creer(
                image, titre, description, tag, icone,
                PageCible.valueOf(pageCible),
                lien,
                ordre != null ? Integer.parseInt(ordre) : null,
                dateDebut != null && !dateDebut.isBlank() ? LocalDateTime.parse(dateDebut) : null,
                dateFin  != null && !dateFin.isBlank()  ? LocalDateTime.parse(dateFin)  : null
        );
        return ResponseEntity.ok(resp);
    }

    @PutMapping(value = "/{id}", consumes = "multipart/form-data")
    public ResponseEntity<BanniereResponse> modifier(
            @PathVariable UUID id,
            @RequestPart(value = "image", required = false) MultipartFile image,
            @RequestPart(value = "titre", required = false) String titre,
            @RequestPart(value = "description", required = false) String description,
            @RequestPart(value = "tag", required = false) String tag,
            @RequestPart(value = "icone", required = false) String icone,
            @RequestPart(value = "pageCible", required = false) String pageCible,
            @RequestPart(value = "lien", required = false) String lien,
            @RequestPart(value = "ordre", required = false) String ordre,
            @RequestPart(value = "dateDebut", required = false) String dateDebut,
            @RequestPart(value = "dateFin", required = false) String dateFin
    ) throws IOException {
        BanniereResponse resp = banniereService.modifier(
                id, image, titre, description, tag, icone,
                pageCible != null ? PageCible.valueOf(pageCible) : null,
                lien,
                ordre != null && !ordre.isBlank() ? Integer.parseInt(ordre) : null,
                dateDebut != null && !dateDebut.isBlank() ? LocalDateTime.parse(dateDebut) : null,
                dateFin  != null && !dateFin.isBlank()  ? LocalDateTime.parse(dateFin)  : null
        );
        return ResponseEntity.ok(resp);
    }

    @PatchMapping("/{id}/toggle")
    public ResponseEntity<BanniereResponse> toggle(@PathVariable UUID id) {
        return ResponseEntity.ok(banniereService.toggleActif(id));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> supprimer(@PathVariable UUID id) {
        banniereService.supprimer(id);
        return ResponseEntity.noContent().build();
    }
}
