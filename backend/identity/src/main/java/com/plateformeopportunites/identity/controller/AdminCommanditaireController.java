package com.plateformeopportunites.identity.controller;

import com.plateformeopportunites.common.enums.StatutCommanditaire;
import com.plateformeopportunites.identity.dto.*;
import com.plateformeopportunites.identity.service.CommanditaireService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin/commanditaires")
@RequiredArgsConstructor
public class AdminCommanditaireController {
    private final CommanditaireService service;

    @GetMapping public List<CommanditaireResponse> lister() { return service.lister(); }
    @GetMapping("/{id}") public CommanditaireResponse consulter(@PathVariable UUID id) { return service.consulter(id); }

    @PostMapping
    public ResponseEntity<CommanditaireResponse> creer(@Valid @RequestBody CreerCommanditaireRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.creer(req));
    }

    @PutMapping("/{id}")
    public CommanditaireResponse modifier(@PathVariable UUID id, @Valid @RequestBody ModifierCommanditaireRequest req) {
        return service.modifier(id, req);
    }

    @PatchMapping("/{id}/activer")
    public CommanditaireResponse activer(@PathVariable UUID id, @Valid @RequestBody ChangerStatutCommanditaireRequest req) {
        return service.changerStatut(id, StatutCommanditaire.ACTIF, req.getMotif());
    }

    @PatchMapping("/{id}/suspendre")
    public CommanditaireResponse suspendre(@PathVariable UUID id, @Valid @RequestBody ChangerStatutCommanditaireRequest req) {
        return service.changerStatut(id, StatutCommanditaire.SUSPENDU, req.getMotif());
    }

    @PostMapping("/{id}/alimentations")
    public CommanditaireResponse alimenter(@PathVariable UUID id, @Valid @RequestBody AlimenterCommanditaireRequest req) {
        return service.alimenter(id, req);
    }

    @GetMapping("/{id}/mouvements")
    public List<MouvementCommanditaireResponse> mouvements(@PathVariable UUID id) { return service.mouvements(id); }
}
