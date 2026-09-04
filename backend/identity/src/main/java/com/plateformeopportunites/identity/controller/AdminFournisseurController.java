package com.plateformeopportunites.identity.controller;

import com.plateformeopportunites.common.enums.StatutFournisseur;
import com.plateformeopportunites.identity.dto.CreerFournisseurRequest;
import com.plateformeopportunites.identity.dto.FournisseurResponse;
import com.plateformeopportunites.identity.entity.Fournisseur;
import com.plateformeopportunites.identity.repository.FournisseurRepository;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin/fournisseurs")
@RequiredArgsConstructor
public class AdminFournisseurController {

    private final FournisseurRepository fournisseurRepository;

    @GetMapping
    public ResponseEntity<List<FournisseurResponse>> lister() {
        return ResponseEntity.ok(fournisseurRepository.findAll().stream().map(this::toResponse).toList());
    }

    @PostMapping
    @Transactional
    public ResponseEntity<FournisseurResponse> creer(@Valid @RequestBody CreerFournisseurRequest req) {
        if (fournisseurRepository.existsByEmail(req.getEmail())) return ResponseEntity.status(409).build();
        Fournisseur fournisseur = Fournisseur.builder()
                .nom(req.getNom())
                .societe(req.getSociete())
                .email(req.getEmail())
                .telephone(req.getTelephone())
                .logoUrl(req.getLogoUrl())
                .reseauxUrl(req.getReseauxUrl())
                .build();
        return ResponseEntity.ok(toResponse(fournisseurRepository.save(fournisseur)));
    }

    @PatchMapping("/{id}/activer")
    @Transactional
    public ResponseEntity<FournisseurResponse> activer(@PathVariable UUID id) {
        return fournisseurRepository.findById(id).map(f -> {
            f.setStatut(StatutFournisseur.ACTIF);
            return ResponseEntity.ok(toResponse(fournisseurRepository.save(f)));
        }).orElse(ResponseEntity.notFound().build());
    }

    @PatchMapping("/{id}/suspendre")
    @Transactional
    public ResponseEntity<FournisseurResponse> suspendre(@PathVariable UUID id) {
        return fournisseurRepository.findById(id).map(f -> {
            f.setStatut(StatutFournisseur.SUSPENDU);
            return ResponseEntity.ok(toResponse(fournisseurRepository.save(f)));
        }).orElse(ResponseEntity.notFound().build());
    }

    private FournisseurResponse toResponse(Fournisseur f) {
        return FournisseurResponse.builder()
                .id(f.getId()).nom(f.getNom()).societe(f.getSociete())
                .email(f.getEmail()).telephone(f.getTelephone())
                .logoUrl(f.getLogoUrl()).reseauxUrl(f.getReseauxUrl())
                .statut(f.getStatut()).build();
    }
}
