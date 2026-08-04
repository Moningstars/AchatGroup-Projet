package com.plateformeopportunites.finance.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "paiements_paygate")
@Getter @Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PaiementPaygate {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private UUID utilisateurId;

    @Column(nullable = false, unique = true)
    private String identifier;

    private String txReference;

    @Column(nullable = false)
    private BigDecimal montant;

    @Column(nullable = false)
    private String telephone;

    @Column(nullable = false)
    private String network;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private StatutPaiementPaygate statut;

    private String paymentReference;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    private LocalDateTime confirmedAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        if (this.statut == null) this.statut = StatutPaiementPaygate.EN_ATTENTE;
    }

    public enum StatutPaiementPaygate {
        EN_ATTENTE, CONFIRME, ECHOUE
    }
}
