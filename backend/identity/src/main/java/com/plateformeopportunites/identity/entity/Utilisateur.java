package com.plateformeopportunites.identity.entity;

import com.plateformeopportunites.common.enums.NiveauVerification;
import com.plateformeopportunites.common.enums.OperateurMobile;
import com.plateformeopportunites.common.enums.StatutCompte;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "utilisateurs")
@Getter @Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Utilisateur {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    private String nom;

    @Column(unique = true)
    private String telephone;

    private String motDePasse;

    private String pushToken;

    @Enumerated(EnumType.STRING)
    private OperateurMobile operateurMobile;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private StatutCompte statut;

    @Column(nullable = false)
    private Boolean profilComplete;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private NiveauVerification niveauVerification;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.statut = StatutCompte.EN_ATTENTE;
        this.profilComplete = false;
        this.niveauVerification = NiveauVerification.AUCUN;
    }
}
