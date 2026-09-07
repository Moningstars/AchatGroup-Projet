package com.plateformeopportunites.identity.entity;

import com.plateformeopportunites.common.enums.StatutCommanditaire;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "commanditaires")
@Getter @Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Commanditaire {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private String nom;

    @Column(nullable = false)
    private String prenom;

    private String societe;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(nullable = false, unique = true)
    private String telephone;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private StatutCommanditaire statut;

    @Column(nullable = false, precision = 15, scale = 2, columnDefinition = "numeric(15,2) default 0")
    private BigDecimal soldeDisponible;

    @Column(nullable = false, precision = 15, scale = 2, columnDefinition = "numeric(15,2) default 0")
    private BigDecimal soldeReserve;

    @Column(nullable = false, precision = 15, scale = 2, columnDefinition = "numeric(15,2) default 0")
    private BigDecimal totalAlimente;

    @Column(nullable = false, precision = 15, scale = 2, columnDefinition = "numeric(15,2) default 0")
    private BigDecimal totalDistribue;

    @Column(columnDefinition = "TEXT")
    private String motifStatut;

    @Column(updatable = false)
    private LocalDateTime createdAt;

    @Column
    private LocalDateTime updatedAt;

    private LocalDateTime statutChangedAt;

    @PrePersist
    protected void onCreate() {
        if (this.statut == null) this.statut = StatutCommanditaire.EN_ATTENTE;
        if (this.soldeDisponible == null) this.soldeDisponible = BigDecimal.ZERO;
        if (this.soldeReserve == null) this.soldeReserve = BigDecimal.ZERO;
        if (this.totalAlimente == null) this.totalAlimente = BigDecimal.ZERO;
        if (this.totalDistribue == null) this.totalDistribue = BigDecimal.ZERO;
        this.createdAt = LocalDateTime.now();
        this.updatedAt = this.createdAt;
        this.statutChangedAt = this.createdAt;
    }

    @PreUpdate
    protected void onUpdate() { this.updatedAt = LocalDateTime.now(); }
}
