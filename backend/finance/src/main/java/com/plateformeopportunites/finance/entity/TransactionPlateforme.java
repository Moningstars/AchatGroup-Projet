package com.plateformeopportunites.finance.entity;

import com.plateformeopportunites.common.enums.ModeDistribution;
import com.plateformeopportunites.common.enums.StatutTransaction;
import com.plateformeopportunites.common.enums.TypeTransactionPlateforme;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "transactions_plateforme")
@Getter @Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TransactionPlateforme {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    private UUID sondageId;

    private UUID adminId; // null pour distribution automatique

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TypeTransactionPlateforme type;

    @Column(nullable = false)
    private BigDecimal montant;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private StatutTransaction statut;

    @Enumerated(EnumType.STRING)
    private ModeDistribution modeDistribution;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        if (this.statut == null) this.statut = StatutTransaction.EN_COURS;
    }
}
