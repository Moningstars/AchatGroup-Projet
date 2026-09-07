package com.plateformeopportunites.sondage.entity;

import com.plateformeopportunites.common.enums.*;
import com.plateformeopportunites.identity.entity.Administrateur;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "sondages")
@Getter @Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Sondage {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "admin_id", nullable = false)
    private Administrateur admin;

    @Column(name = "commanditaire_id")
    private UUID commanditaireId;

    @Column(nullable = false)
    private String titre;

    @Column(columnDefinition = "TEXT")
    private String imageUrl;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(nullable = false)
    private Integer quotaVise;

    @Column(nullable = false)
    private Integer repondantsActuels;

    @Column(nullable = false)
    private BigDecimal recompense;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TypeRecompense typeRecompense;

    @Column(nullable = false)
    private BigDecimal seuilEligibilite;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private NiveauVerification niveauVerification;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ModeDistribution modeDistribution;

    @Column(nullable = false)
    private LocalDateTime dateExpiration;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private StatutSondage statut;

    @Column(precision = 15, scale = 2)
    private BigDecimal budgetReserve;

    @Column(precision = 15, scale = 2)
    private BigDecimal budgetDistribue;

    @Column
    private Boolean budgetLibere;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @OneToMany(mappedBy = "sondage", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<Question> questions;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.statut = StatutSondage.BROUILLON;
        this.repondantsActuels = 0;
        this.budgetReserve = BigDecimal.ZERO;
        this.budgetDistribue = BigDecimal.ZERO;
        this.budgetLibere = false;
    }
}
