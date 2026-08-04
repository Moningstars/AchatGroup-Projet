package com.plateformeopportunites.finance.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "wallet_plateforme")
@Getter @Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WalletPlateforme {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private BigDecimal soldePlateforme;

    @Column(nullable = false)
    private BigDecimal soldeReserve;

    @Column(nullable = false)
    private BigDecimal soldePoints;

    @Column(nullable = false)
    private String devise;

    /** Points donnés par FCFA (ex: 10 → 10 pts = 1 FCFA versé). Utilisé pour la conversion retour. */
    private BigDecimal tauxConversionPoints;

    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        if (this.soldePlateforme == null) this.soldePlateforme = BigDecimal.ZERO;
        if (this.soldeReserve == null) this.soldeReserve = BigDecimal.ZERO;
        if (this.soldePoints == null) this.soldePoints = BigDecimal.ZERO;
        if (this.devise == null) this.devise = "XOF";
        if (this.tauxConversionPoints == null) this.tauxConversionPoints = BigDecimal.TEN;
        this.updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}