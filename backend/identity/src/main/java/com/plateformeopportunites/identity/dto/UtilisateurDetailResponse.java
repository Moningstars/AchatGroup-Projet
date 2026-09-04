package com.plateformeopportunites.identity.dto;

import com.plateformeopportunites.common.enums.NiveauVerification;
import com.plateformeopportunites.common.enums.SourceRevenus;
import com.plateformeopportunites.common.enums.StatutCompte;
import com.plateformeopportunites.common.enums.TypePiece;
import lombok.Builder;
import lombok.Data;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
public class UtilisateurDetailResponse {

    // ── Compte ───────────────────────────────────────────────────────────────
    private UUID id;
    private String telephone;
    private StatutCompte statut;
    private NiveauVerification niveauVerification;
    private Boolean profilComplete;
    private LocalDateTime createdAt;

    // ── Identité ─────────────────────────────────────────────────────────────
    private String nom;
    private String prenom;
    private LocalDate dateNaissance;
    private String lieuNaissance;
    private String nationalite;

    // ── Pièce d'identité ─────────────────────────────────────────────────────
    private TypePiece typePiece;
    private String numeroPiece;
    private LocalDate dateExpirationPiece;

    // ── Coordonnées ───────────────────────────────────────────────────────────
    private String email;
    private String adresse;
    private String ville;
    private String pays;

    // ── Situation professionnelle ─────────────────────────────────────────────
    private String profession;
    private SourceRevenus sourceRevenus;
}
