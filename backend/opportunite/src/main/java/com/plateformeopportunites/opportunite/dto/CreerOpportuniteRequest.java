package com.plateformeopportunites.opportunite.dto;

import com.plateformeopportunites.common.enums.ModePlafond;
import jakarta.validation.constraints.*;
import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
public class CreerOpportuniteRequest {

    @NotBlank
    private String titre;

    private String description;

    private String specsPointsForts;

    private String specsCasUsage;

    private String specsFinePrint;

    @NotNull
    @DecimalMin("0")
    private BigDecimal prixNormal;

    @NotNull
    @Min(1)
    private Integer seuilMinimum;

    /** Plafond de participants/quantité (optionnel, ex: stock fournisseur limité). */
    @Min(1)
    private Integer seuilMaximal;

    private ModePlafond modePlafond;

    @NotNull
    @Future
    private LocalDateTime dateExpiration;

    /** Nom de la catégorie (optionnel). Créée automatiquement si inconnue. */
    private String categorie;

    private UUID commanditaireId;
    private String partenaireNom;
    private String partenaireLogoUrl;
    private String partenaireContact;
    private String partenaireReseauxUrl;
    @DecimalMin("0") private BigDecimal montantDuPartenaire;
    @DecimalMin("0") private BigDecimal montantPayePartenaire;
    @Min(1) private Integer delaiConfirmationReceptionJours;
    @Size(max = 500) private String messageNotificationLivraison;
    @Size(max = 500) private String messagePartage;

    /** true = ACTIVE immédiatement, false (défaut) = BROUILLON */
    private boolean actif = true;

    @NotEmpty
    private List<PalierPrixRequest> paliers;

    @Data
    public static class PalierPrixRequest {
        @NotNull @Min(1)
        private Integer seuilMin;
        @NotNull @Min(1)
        private Integer seuilMax;
        @NotNull @DecimalMin("0")
        private BigDecimal prix;
    }
}
