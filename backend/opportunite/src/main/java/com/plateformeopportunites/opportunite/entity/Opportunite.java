package com.plateformeopportunites.opportunite.entity;

import com.plateformeopportunites.common.enums.StatutOpportunite;
import com.plateformeopportunites.identity.entity.Administrateur;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "opportunites")
@Getter @Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Opportunite {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "admin_id", nullable = false)
    private Administrateur admin;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "categorie_id")
    private Categorie categorie;

    @Column(nullable = false)
    private String titre;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(columnDefinition = "TEXT")
    private String specsPointsForts;

    @Column(columnDefinition = "TEXT")
    private String specsCasUsage;

    @Column(columnDefinition = "TEXT")
    private String specsFinePrint;

    @Column(nullable = false)
    private BigDecimal prixNormal;

    @Column(nullable = false)
    private Integer seuilMinimum;

    /** Plafond de participants/quantité (ex: stock fournisseur limité). NULL = pas de plafond. */
    private Integer seuilMaximal;

    @Column(nullable = false)
    private Integer participantsActuels;

    @Column(nullable = false)
    private LocalDateTime dateExpiration;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private StatutOpportunite statut;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @OneToMany(mappedBy = "opportunite", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<PalierPrix> paliers;

    @OneToMany(mappedBy = "opportunite", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @OrderBy("ordre ASC")
    private List<OpportuniteImage> images;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        if (this.statut == null) this.statut = StatutOpportunite.BROUILLON;
        if (this.participantsActuels == null) this.participantsActuels = 0;
    }
}
