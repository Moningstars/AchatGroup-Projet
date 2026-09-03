package com.plateformeopportunites.opportunite.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.Min;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
public class ModifierOpportuniteRequest {

    private String titre;

    private String description;

    private String specsPointsForts;

    private String specsCasUsage;

    private String specsFinePrint;

    @DecimalMin("0")
    private BigDecimal prixNormal;

    @Min(1)
    private Integer seuilMinimum;

    /** Plafond de participants/quantité (optionnel). null = ne pas modifier. */
    @Min(1)
    private Integer seuilMaximal;

    @Future
    private LocalDateTime dateExpiration;

    /** Nom de la catégorie (optionnel). Créée automatiquement si inconnue. */
    private String categorie;

    private String partenaireNom;
    private String partenaireLogoUrl;
    private String partenaireContact;
    private String partenaireReseauxUrl;
    @DecimalMin("0") private BigDecimal montantDuPartenaire;
    @DecimalMin("0") private BigDecimal montantPayePartenaire;
    @Min(1) private Integer delaiConfirmationReceptionJours;
    private String messageNotificationLivraison;

    /** Si fourni, remplace intégralement les paliers existants. */
    private List<CreerOpportuniteRequest.PalierPrixRequest> paliers;
}
