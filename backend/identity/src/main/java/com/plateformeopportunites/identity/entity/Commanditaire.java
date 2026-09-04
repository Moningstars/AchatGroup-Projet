package com.plateformeopportunites.identity.entity;

import com.plateformeopportunites.common.enums.StatutCommanditaire;
import jakarta.persistence.*;
import lombok.*;
import java.util.UUID;

@Entity
@Table(name = "commanditaires")
@Getter @Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Commanditaire {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private String nom;

    @Column(nullable = false)
    private String prenom;

    private String societe;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(nullable = false, unique = true)
    private String telephone;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private StatutCommanditaire statut;

    @PrePersist
    protected void onCreate() {
        this.statut = StatutCommanditaire.EN_ATTENTE;
    }
}
