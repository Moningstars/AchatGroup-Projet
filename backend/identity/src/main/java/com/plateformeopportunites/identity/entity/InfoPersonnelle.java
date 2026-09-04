package com.plateformeopportunites.identity.entity;

import com.plateformeopportunites.common.enums.SourceRevenus;
import com.plateformeopportunites.common.enums.TypePiece;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "infos_personnelles")
@Getter @Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class InfoPersonnelle {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "utilisateur_id", nullable = false, unique = true)
    private Utilisateur utilisateur;

    // ── Identité ─────────────────────────────────────────────────────────────

    @Column(nullable = false)
    private String nom;

    @Column(nullable = false)
    private String prenom;

    private LocalDate dateNaissance;

    private String lieuNaissance;

    private String nationalite;

    // ── Pièce d'identité ─────────────────────────────────────────────────────

    @Enumerated(EnumType.STRING)
    private TypePiece typePiece;

    @Column(unique = true)
    private String numeroPiece;

    private LocalDate dateExpirationPiece;

    // ── Coordonnées ───────────────────────────────────────────────────────────

    @Column(unique = true)
    private String email;

    private String adresse;

    private String ville;

    private String pays;

    // ── Situation professionnelle ─────────────────────────────────────────────

    private String profession;

    @Enumerated(EnumType.STRING)
    private SourceRevenus sourceRevenus;

    private String photo;
}
