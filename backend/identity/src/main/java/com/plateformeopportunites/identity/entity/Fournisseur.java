package com.plateformeopportunites.identity.entity;

import com.plateformeopportunites.common.enums.StatutFournisseur;
import jakarta.persistence.*;
import lombok.*;
import java.util.UUID;

@Entity
@Table(name = "fournisseurs")
@Getter @Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Fournisseur {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private String nom;

    private String societe;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(nullable = false, unique = true)
    private String telephone;

    private String logoUrl;

    private String reseauxUrl;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private StatutFournisseur statut;

    @PrePersist
    protected void onCreate() {
        if (this.statut == null) this.statut = StatutFournisseur.EN_ATTENTE;
    }
}
