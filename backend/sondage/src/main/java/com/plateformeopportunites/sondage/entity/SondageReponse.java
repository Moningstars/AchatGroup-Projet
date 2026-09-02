package com.plateformeopportunites.sondage.entity;

import com.plateformeopportunites.common.enums.StatutValidation;
import com.plateformeopportunites.identity.entity.Utilisateur;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Entity
@Table(
    name = "sondages_reponses",
    uniqueConstraints = @UniqueConstraint(columnNames = {"utilisateur_id", "sondage_id"})
)
@Getter @Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SondageReponse {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sondage_id", nullable = false)
    private Sondage sondage;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "utilisateur_id", nullable = false)
    private Utilisateur utilisateur;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private StatutValidation statutValidation;

    private String fichierPreuve;

    @Column(nullable = false)
    private Boolean recompenseVersee;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    private LocalDateTime valideeAt;

    @OneToMany(mappedBy = "sondageReponse", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<ReponseDetail> details;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.statutValidation = StatutValidation.EN_ATTENTE_PREUVE;
        this.recompenseVersee = false;
    }
}
