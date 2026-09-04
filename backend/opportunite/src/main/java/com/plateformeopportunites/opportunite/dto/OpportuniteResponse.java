package com.plateformeopportunites.opportunite.dto;

import com.plateformeopportunites.common.enums.ModePlafond;
import com.plateformeopportunites.common.enums.StatutOpportunite;
import lombok.Builder;
import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
@Builder
public class OpportuniteResponse {
    private UUID id;
    private String titre;
    private String description;
    private String specsPointsForts;
    private String specsCasUsage;
    private String specsFinePrint;
    private BigDecimal prixNormal;
    private BigDecimal prixActuel;
    private Integer seuilMinimum;
    private Integer seuilMaximal;
    private ModePlafond modePlafond;
    private Integer participantsActuels;
    private Integer placesRestantes;
    private Boolean souscriptionOuverte;
    private Boolean activationAtteinte;
    private String raisonIndisponibilite;
    private String statutTraitement;
    private Integer dossiersATraiter;
    private Integer dossiersEnCours;
    private Integer dossiersTermines;
    private LocalDateTime dateExpiration;
    private StatutOpportunite statut;
    private LocalDateTime createdAt;
    private String categorie;
    private String categorieIcone;
    private UUID fournisseurId;
    private String partenaireNom;
    private String partenaireLogoUrl;
    private String partenaireContact;
    private String partenaireReseauxUrl;
    private BigDecimal montantDuPartenaire;
    private BigDecimal montantPayePartenaire;
    private BigDecimal montantRestantPartenaire;
    private String statutPaiementPartenaire;
    private LocalDateTime dateConfirmationPartenaire;
    private Integer delaiConfirmationReceptionJours;
    private String messageNotificationLivraison;
    private String messagePartage;
    private List<PalierPrixResponse> paliers;
    private List<ImageResponse> images;

    @Data
    @Builder
    public static class PalierPrixResponse {
        private UUID id;
        private Integer seuilMin;
        private Integer seuilMax;
        private BigDecimal prix;
    }

    @Data
    @Builder
    public static class ImageResponse {
        private UUID id;
        private String url;
        private String legende;
        private Integer ordre;
    }
}
