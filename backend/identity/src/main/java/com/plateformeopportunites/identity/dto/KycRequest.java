package com.plateformeopportunites.identity.dto;

import com.plateformeopportunites.common.enums.SourceRevenus;
import com.plateformeopportunites.common.enums.TypePiece;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import java.time.LocalDate;

@Data
public class KycRequest {

    // ── Identité ─────────────────────────────────────────────────────────────

    @NotBlank
    private String nom;

    @NotBlank
    private String prenom;

    @NotNull
    private LocalDate dateNaissance;

    @NotBlank
    private String lieuNaissance;

    @NotBlank
    private String nationalite;

    // ── Pièce d'identité ─────────────────────────────────────────────────────

    @NotNull
    private TypePiece typePiece;

    @NotBlank
    private String numeroPiece;

    @NotNull
    private LocalDate dateExpirationPiece;

    // ── Coordonnées ───────────────────────────────────────────────────────────

    @NotBlank
    @Email
    private String email;

    @NotBlank
    private String adresse;

    @NotBlank
    private String ville;

    @NotBlank
    private String pays;

    // ── Situation professionnelle (optionnel) ─────────────────────────────────

    private String profession;

    private SourceRevenus sourceRevenus;
}
