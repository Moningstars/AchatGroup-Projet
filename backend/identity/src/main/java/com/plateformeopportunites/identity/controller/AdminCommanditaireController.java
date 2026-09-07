package com.plateformeopportunites.identity.controller;

import com.plateformeopportunites.common.enums.StatutCommanditaire;
import com.plateformeopportunites.identity.dto.AlimenterCommanditaireRequest;
import com.plateformeopportunites.identity.dto.CommanditaireResponse;
import com.plateformeopportunites.identity.dto.CreerCommanditaireRequest;
import com.plateformeopportunites.identity.dto.ChangerStatutCommanditaireRequest;
import com.plateformeopportunites.identity.dto.MouvementCommanditaireResponse;
import com.plateformeopportunites.identity.entity.Commanditaire;
import com.plateformeopportunites.identity.repository.CommanditaireRepository;
import com.plateformeopportunites.identity.service.CommanditaireHistoryService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin/commanditaires")
@RequiredArgsConstructor
public class AdminCommanditaireController {

    private final CommanditaireRepository commanditaireRepository;
    private final CommanditaireHistoryService commanditaireHistoryService;

    @GetMapping
    public ResponseEntity<List<CommanditaireResponse>> lister() {
        return ResponseEntity.ok(
                commanditaireRepository.findAll().stream().map(this::toResponse).toList()
        );
    }

    @PostMapping
    @Transactional
    public ResponseEntity<CommanditaireResponse> creer(@Valid @RequestBody CreerCommanditaireRequest req) {
        if (commanditaireRepository.existsByEmail(req.getEmail())) {
            return ResponseEntity.status(409).build();
        }
        Commanditaire c = Commanditaire.builder()
                .nom(req.getNom())
                .prenom(req.getPrenom())
                .societe(req.getSociete())
                .email(req.getEmail())
                .telephone(req.getTelephone())
                .build();
        return ResponseEntity.ok(toResponse(commanditaireRepository.save(c)));
    }

    @PatchMapping("/{id}/activer")
    @Transactional
    public ResponseEntity<CommanditaireResponse> activer(@PathVariable UUID id,
                                                          @RequestBody(required = false) ChangerStatutCommanditaireRequest request) {
        return commanditaireRepository.findById(id).map(c -> {
            c.setStatut(StatutCommanditaire.ACTIF);
            c.setMotifStatut(request == null ? null : request.getMotif());
            return ResponseEntity.ok(toResponse(commanditaireRepository.save(c)));
        }).orElse(ResponseEntity.notFound().build());
    }

    @PatchMapping("/{id}/suspendre")
    @Transactional
    public ResponseEntity<CommanditaireResponse> suspendre(@PathVariable UUID id,
                                                            @RequestBody(required = false) ChangerStatutCommanditaireRequest request) {
        return commanditaireRepository.findById(id).map(c -> {
            c.setStatut(StatutCommanditaire.SUSPENDU);
            c.setMotifStatut(request == null ? null : request.getMotif());
            return ResponseEntity.ok(toResponse(commanditaireRepository.save(c)));
        }).orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/{id}/alimentations")
    public ResponseEntity<CommanditaireResponse> alimenter(@PathVariable UUID id,
                                                            @Valid @RequestBody AlimenterCommanditaireRequest request) {
        return commanditaireRepository.findById(id)
                .map(commanditaire -> ResponseEntity.ok(toResponse(commanditaireHistoryService.alimenter(id, request))))
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/{id}/mouvements")
    public ResponseEntity<List<MouvementCommanditaireResponse>> mouvements(@PathVariable UUID id) {
        if (!commanditaireRepository.existsById(id)) return ResponseEntity.notFound().build();
        return ResponseEntity.ok(commanditaireHistoryService.mouvements(id));
    }

    private CommanditaireResponse toResponse(Commanditaire c) {
        return CommanditaireResponse.builder()
                .id(c.getId())
                .nom(c.getNom())
                .prenom(c.getPrenom())
                .societe(c.getSociete())
                .email(c.getEmail())
                .telephone(c.getTelephone())
                .statut(c.getStatut())
                .soldeDisponible(c.getSoldeDisponible())
                .soldeReserve(c.getSoldeReserve())
                .totalAlimente(c.getTotalAlimente())
                .totalDistribue(c.getTotalDistribue())
                .motifStatut(c.getMotifStatut())
                .createdAt(c.getCreatedAt())
                .updatedAt(c.getUpdatedAt())
                .build();
    }
}
