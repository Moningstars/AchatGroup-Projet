package com.plateformeopportunites.identity.controller;

import com.plateformeopportunites.common.enums.NiveauVerification;
import com.plateformeopportunites.common.enums.StatutCompte;
import com.plateformeopportunites.identity.dto.UtilisateurDetailResponse;
import com.plateformeopportunites.identity.dto.UtilisateurResponse;
import com.plateformeopportunites.identity.entity.InfoPersonnelle;
import com.plateformeopportunites.identity.entity.Utilisateur;
import com.plateformeopportunites.identity.repository.InfoPersonnelleRepository;
import com.plateformeopportunites.identity.repository.UtilisateurRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.constraints.NotNull;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin/utilisateurs")
@RequiredArgsConstructor
@Tag(name = "Admin — Utilisateurs", description = "Gestion des comptes participants")
public class AdminUtilisateurController {

    private final UtilisateurRepository utilisateurRepository;
    private final InfoPersonnelleRepository infoPersonnelleRepository;

    // ── Liste ────────────────────────────────────────────────────────────────────

    @Operation(summary = "Lister tous les participants")
    @GetMapping
    public ResponseEntity<List<UtilisateurResponse>> lister() {
        return ResponseEntity.ok(
                utilisateurRepository.findAll().stream().map(this::toResponse).toList()
        );
    }

    // ── Détail ───────────────────────────────────────────────────────────────────

    @Operation(summary = "Voir le détail complet d'un participant (compte + infos personnelles)")
    @GetMapping("/{id}/detail")
    public ResponseEntity<UtilisateurDetailResponse> detail(@PathVariable UUID id) {
        return utilisateurRepository.findById(id).map(u -> {
            InfoPersonnelle info = infoPersonnelleRepository.findByUtilisateurId(u.getId()).orElse(null);
            return ResponseEntity.ok(toDetailResponse(u, info));
        }).orElse(ResponseEntity.notFound().build());
    }

    // ── Activer ──────────────────────────────────────────────────────────────────

    @Operation(summary = "Activer un compte (statut → ACTIF)")
    @PatchMapping("/{id}/activer")
    @Transactional
    public ResponseEntity<UtilisateurResponse> activer(@PathVariable UUID id) {
        return utilisateurRepository.findById(id).map(u -> {
            u.setStatut(StatutCompte.ACTIF);
            return ResponseEntity.ok(toResponse(utilisateurRepository.save(u)));
        }).orElse(ResponseEntity.notFound().build());
    }

    // ── Suspendre ────────────────────────────────────────────────────────────────

    @Operation(summary = "Suspendre un compte (statut → SUSPENDU)")
    @PatchMapping("/{id}/suspendre")
    @Transactional
    public ResponseEntity<UtilisateurResponse> suspendre(@PathVariable UUID id) {
        return utilisateurRepository.findById(id).map(u -> {
            u.setStatut(StatutCompte.SUSPENDU);
            return ResponseEntity.ok(toResponse(utilisateurRepository.save(u)));
        }).orElse(ResponseEntity.notFound().build());
    }

    // ── Changer niveau de vérification ───────────────────────────────────────────

    @Operation(
        summary = "Changer le niveau de vérification",
        description = "Valeurs possibles : AUCUN, QUESTIONS_FILTRES, PREUVE_DOCUMENT"
    )
    @PatchMapping("/{id}/verification")
    @Transactional
    public ResponseEntity<UtilisateurResponse> changerVerification(
            @PathVariable UUID id,
            @RequestParam @NotNull NiveauVerification niveau) {
        return utilisateurRepository.findById(id).map(u -> {
            u.setNiveauVerification(niveau);
            return ResponseEntity.ok(toResponse(utilisateurRepository.save(u)));
        }).orElse(ResponseEntity.notFound().build());
    }

    // ── Supprimer ────────────────────────────────────────────────────────────────

    @Operation(
        summary = "Supprimer un participant",
        description = "Supprime le compte uniquement si l'utilisateur n'a aucune donnée liée (participations, transactions). Sinon, préférez suspendre."
    )
    @DeleteMapping("/{id}")
    @Transactional
    public ResponseEntity<Void> supprimer(@PathVariable UUID id) {
        if (!utilisateurRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        try {
            utilisateurRepository.deleteById(id);
            return ResponseEntity.noContent().build();
        } catch (Exception e) {
            return ResponseEntity.status(409).build(); // conflit FK → suspendre à la place
        }
    }

    // ── Helpers ──────────────────────────────────────────────────────────────────

    private UtilisateurResponse toResponse(Utilisateur u) {
        return UtilisateurResponse.builder()
                .id(u.getId())
                .nom(u.getNom())
                .telephone(u.getTelephone())
                .statut(u.getStatut())
                .niveauVerification(u.getNiveauVerification())
                .profilComplete(u.getProfilComplete())
                .createdAt(u.getCreatedAt())
                .build();
    }

    private UtilisateurDetailResponse toDetailResponse(Utilisateur u, InfoPersonnelle info) {
        UtilisateurDetailResponse.UtilisateurDetailResponseBuilder b = UtilisateurDetailResponse.builder()
                .id(u.getId())
                .telephone(u.getTelephone())
                .statut(u.getStatut())
                .niveauVerification(u.getNiveauVerification())
                .profilComplete(u.getProfilComplete())
                .createdAt(u.getCreatedAt())
                .nom(u.getNom());

        if (info != null) {
            b.prenom(info.getPrenom())
             .dateNaissance(info.getDateNaissance())
             .lieuNaissance(info.getLieuNaissance())
             .nationalite(info.getNationalite())
             .typePiece(info.getTypePiece())
             .numeroPiece(info.getNumeroPiece())
             .dateExpirationPiece(info.getDateExpirationPiece())
             .email(info.getEmail())
             .adresse(info.getAdresse())
             .ville(info.getVille())
             .pays(info.getPays())
             .profession(info.getProfession())
             .sourceRevenus(info.getSourceRevenus());
        }

        return b.build();
    }
}
