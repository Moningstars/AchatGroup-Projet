package com.plateformeopportunites.opportunite.entity;

import com.plateformeopportunites.common.enums.PageCible;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "bannieres")
@Getter @Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Banniere {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private String titre;

    @Column(columnDefinition = "TEXT")
    private String description;

    private String tag;

    private String icone;

    @Column(nullable = false)
    private String imageUrl;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private PageCible pageCible;

    private String lien;

    @Column(nullable = false)
    private Integer ordre;

    @Column(nullable = false)
    private Boolean actif;

    @Column
    private Boolean brouillon;

    @Column
    private Long impressions;

    @Column
    private Long clics;

    private LocalDateTime dateDebut;

    private LocalDateTime dateFin;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        if (this.actif == null) this.actif = true;
        if (this.brouillon == null) this.brouillon = false;
        if (this.impressions == null) this.impressions = 0L;
        if (this.clics == null) this.clics = 0L;
        if (this.ordre == null) this.ordre = 0;
    }
}
