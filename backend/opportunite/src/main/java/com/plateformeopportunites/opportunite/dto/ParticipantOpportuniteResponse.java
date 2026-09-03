package com.plateformeopportunites.opportunite.dto;

import com.plateformeopportunites.common.enums.StatutParticipation;
import com.plateformeopportunites.common.enums.StatutLivraison;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
public class ParticipantOpportuniteResponse {
    private UUID id;
    private UUID utilisateurId;
    private String nom;
    private String telephone;
    private Integer quantite;
    private BigDecimal montantGele;
    private StatutParticipation statut;
    private String statutPaiement;
    private BigDecimal montantAttendu;
    private BigDecimal montantRestant;
    private Boolean confirmationEnRetard;
    private LocalDateTime creneauTraitement;
    private String noteTraitement;
    private StatutLivraison statutLivraison;
    private Integer progressionLivraison;
    private Boolean prioriteTraitement;
    private LocalDateTime datePreparation;
    private LocalDateTime dateExpedition;
    private LocalDateTime dateLivraisonPrevue;
    private LocalDateTime dateRemise;
    private LocalDateTime dateConfirmationParticipant;
    private String transporteur;
    private String referenceLivraison;
    private String adresseLivraison;
    private String noteLivraison;
    private String commentaireParticipantLivraison;
    private LocalDateTime createdAt;
}
