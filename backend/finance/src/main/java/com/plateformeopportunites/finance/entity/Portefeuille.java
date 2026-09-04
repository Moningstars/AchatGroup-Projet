package com.plateformeopportunites.finance.entity;

import com.plateformeopportunites.identity.entity.Utilisateur;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "portefeuilles")
@Getter @Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Portefeuille {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "utilisateur_id", nullable = false, unique = true)
    private Utilisateur utilisateur;

    @Column(nullable = false)
    private BigDecimal soldeDisponible;

    @Column(nullable = false)
    private BigDecimal soldeGele;

    @Column(nullable = false)
    private BigDecimal soldePoints;

    @Column(nullable = false)
    private String devise;

    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        this.soldeDisponible = BigDecimal.ZERO;
        this.soldeGele = BigDecimal.ZERO;
        this.soldePoints = BigDecimal.ZERO;
        this.devise = "XOF";
        this.updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
