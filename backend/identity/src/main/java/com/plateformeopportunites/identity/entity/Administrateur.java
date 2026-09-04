package com.plateformeopportunites.identity.entity;

import com.plateformeopportunites.common.enums.NiveauAcces;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "administrateurs")
@Getter @Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Administrateur {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private String nom;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(nullable = false)
    private String motDePasse;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private NiveauAcces niveauAcces;

    private LocalDateTime derniereConnexion;

    @PrePersist
    protected void onCreate() {
        if (this.niveauAcces == null) {
            this.niveauAcces = NiveauAcces.MODERATEUR;
        }
    }
}