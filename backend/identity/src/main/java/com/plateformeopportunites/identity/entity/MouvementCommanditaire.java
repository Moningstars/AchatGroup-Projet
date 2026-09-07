package com.plateformeopportunites.identity.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "mouvements_commanditaire", indexes = {
        @Index(name = "idx_mvt_commanditaire_date", columnList = "commanditaire_id,created_at"),
        @Index(name = "idx_mvt_commanditaire_sondage", columnList = "sondage_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MouvementCommanditaire {
    public enum Type { ALIMENTATION, RESERVATION, DISTRIBUTION, LIBERATION }

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "commanditaire_id", nullable = false)
    private Commanditaire commanditaire;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private Type type;

    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal montant;

    @Column(name = "solde_apres", nullable = false, precision = 15, scale = 2)
    private BigDecimal soldeApres;

    @Column(name = "sondage_id")
    private UUID sondageId;

    private String reference;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    void onCreate() {
        if (createdAt == null) createdAt = LocalDateTime.now();
    }
}
