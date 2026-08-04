package com.plateformeopportunites.opportunite.entity;

import com.plateformeopportunites.common.enums.StatutParticipation;
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

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private StatutParticipation statut;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.statut = StatutParticipation.EN_ATTENTE;
    }
}
