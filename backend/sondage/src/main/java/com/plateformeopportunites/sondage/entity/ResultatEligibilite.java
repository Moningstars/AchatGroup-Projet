package com.plateformeopportunites.sondage.entity;

import com.plateformeopportunites.identity.entity.Utilisateur;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(
    name = "resultats_eligibilite",
    uniqueConstraints = @UniqueConstraint(columnNames = {"utilisateur_id", "sondage_eligibilite_id"})
)
@Getter @Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ResultatEligibilite {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "utilisateur_id", nullable = false)
    private Utilisateur utilisateur;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sondage_eligibilite_id", nullable = false)
    private SondageEligibilite sondageEligibilite;

    @Column(nullable = false)
    private BigDecimal tauxObtenu;

    @Column(nullable = false)
    private Boolean estEligible;

    @Column(nullable = false, updatable = false)
    private LocalDateTime passeeAt;

    @PrePersist
    protected void onCreate() {
        this.passeeAt = LocalDateTime.now();
    }
}
