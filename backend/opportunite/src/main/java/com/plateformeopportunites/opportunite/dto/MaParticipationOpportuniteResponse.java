package com.plateformeopportunites.opportunite.dto;

import com.plateformeopportunites.common.enums.StatutOpportunite;
import com.plateformeopportunites.common.enums.StatutParticipation;
import com.plateformeopportunites.common.enums.StatutLivraison;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
public class MaParticipationOpportuniteResponse {
    private UUID id;
    private UUID opportuniteId;
    private String titre;
    private String categorie;
    private String imageUrl;
    private BigDecimal montantGele;
    private Integer quantite;
    private StatutParticipation statut;
    private String statutPaiement;
    private BigDecimal montantRestant;
    private Boolean confirmationEnRetard;
    private StatutLivraison statutLivraison;
    private Integer progressionLivraison;
    private Boolean prioriteTraitement;
    private LocalDateTime creneauTraitement;
    private LocalDateTime dateLivraisonPrevue;
    private LocalDateTime dateRemise;
    private LocalDateTime dateConfirmationParticipant;
    private String transporteur;
    private String referenceLivraison;
    private String commentaireParticipantLivraison;
    private LocalDateTime createdAt;
    private LocalDateTime dateExpiration;
    private StatutOpportunite statutOpportunite;
}
