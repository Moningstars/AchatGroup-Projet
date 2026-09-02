package com.plateformeopportunites.identity.dto;

import com.plateformeopportunites.common.enums.NiveauVerification;
import com.plateformeopportunites.common.enums.SourceRevenus;
import com.plateformeopportunites.common.enums.TypePiece;
import lombok.Builder;
import lombok.Data;
import java.time.LocalDate;

@Data
@Builder
public class KycStatusResponse {
    private NiveauVerification niveauVerification;
    private boolean dejaSoumis;

    // Identité
    private String nom;
    private String prenom;
    private LocalDate dateNaissance;
    private String lieuNaissance;
    private String nationalite;

    // Pièce d'identité
    private TypePiece typePiece;
    private String numeroPiece;
    private LocalDate dateExpirationPiece;

    // Coordonnées
    private String email;
    private String adresse;
    private String ville;
    private String pays;

    // Situation professionnelle
    private String profession;
    private SourceRevenus sourceRevenus;
}
