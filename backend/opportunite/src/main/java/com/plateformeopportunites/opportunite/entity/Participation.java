package com.plateformeopportunites.opportunite.entity;

import com.plateformeopportunites.common.enums.StatutParticipation;
import com.plateformeopportunites.common.enums.StatutLivraison;
import com.plateformeopportunites.identity.entity.Utilisateur;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "participations")
@Getter @Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Participation {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "utilisateur_id", nullable = false)
    private Utilisateur utilisateur;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "opportunite_id", nullable = false)
    private Opportunite opportunite;

    private UUID transactionId;

    @Column(nullable = false)
    private Integer quantite;

    @Column(nullable = false)
    private BigDecimal montantGele;

    /** Parrain à créditer une seule fois lorsque cette première souscription réussit. */
    private UUID parrainId;

    private Boolean recompenseParrainageAttribuee;

    private BigDecimal pointsUtilises;

    private BigDecimal valeurPointsUtilises;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private StatutParticipation statut;

    private LocalDateTime creneauTraitement;

    @Column(length = 500)
    private String noteTraitement;

    @Enumerated(EnumType.STRING)
    private StatutLivraison statutLivraison;

    private Boolean prioriteTraitement;

    private LocalDateTime datePreparation;

    private LocalDateTime dateExpedition;

    private LocalDateTime dateLivraisonPrevue;

    private LocalDateTime dateRemise;

    private LocalDateTime dateConfirmationParticipant;

    @Column(length = 120)
    private String transporteur;

    @Column(length = 120)
    private String referenceLivraison;

    @Column(length = 255)
    private String adresseLivraison;

    @Column(length = 500)
    private String noteLivraison;

    @Column(length = 500)
    private String commentaireParticipantLivraison;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.statut = StatutParticipation.EN_ATTENTE;
        this.statutLivraison = StatutLivraison.EN_ATTENTE_QUOTA;
        this.prioriteTraitement = false;
        if (this.recompenseParrainageAttribuee == null) this.recompenseParrainageAttribuee = false;
        if (this.pointsUtilises == null) this.pointsUtilises = BigDecimal.ZERO;
        if (this.valeurPointsUtilises == null) this.valeurPointsUtilises = BigDecimal.ZERO;
    }
}
