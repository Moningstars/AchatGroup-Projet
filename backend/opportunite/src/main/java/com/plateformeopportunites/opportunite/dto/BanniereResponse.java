package com.plateformeopportunites.opportunite.dto;

import com.plateformeopportunites.common.enums.PageCible;
import com.plateformeopportunites.opportunite.entity.Banniere;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
public class BanniereResponse {
    private UUID id;
    private String titre;
    private String description;
    private String tag;
    private String icone;
    private String imageUrl;
    private PageCible pageCible;
    private String lien;
    private Integer ordre;
    private Boolean actif;
    private Boolean brouillon;
    private String statutDiffusion;
    private Long impressions;
    private Long clics;
    private Double tauxClic;
    private LocalDateTime dateDebut;
    private LocalDateTime dateFin;
    private LocalDateTime createdAt;

    public static BanniereResponse from(Banniere b) {
        long impressions = b.getImpressions() == null ? 0L : b.getImpressions();
        long clics = b.getClics() == null ? 0L : b.getClics();
        return BanniereResponse.builder()
                .id(b.getId())
                .titre(b.getTitre())
                .description(b.getDescription())
                .tag(b.getTag())
                .icone(b.getIcone())
                .imageUrl(b.getImageUrl())
                .pageCible(b.getPageCible())
                .lien(b.getLien())
                .ordre(b.getOrdre())
                .actif(b.getActif())
                .brouillon(Boolean.TRUE.equals(b.getBrouillon()))
                .statutDiffusion(calculerStatut(b, LocalDateTime.now()))
                .impressions(impressions)
                .clics(clics)
                .tauxClic(impressions == 0 ? 0D : Math.round((clics * 10000D) / impressions) / 100D)
                .dateDebut(b.getDateDebut())
                .dateFin(b.getDateFin())
                .createdAt(b.getCreatedAt())
                .build();
    }

    public static String calculerStatut(Banniere b, LocalDateTime maintenant) {
        if (Boolean.TRUE.equals(b.getBrouillon())) return "BROUILLON";
        if (!Boolean.TRUE.equals(b.getActif())) return "MASQUEE";
        if (b.getDateDebut() != null && b.getDateDebut().isAfter(maintenant)) return "PROGRAMMEE";
        if (b.getDateFin() != null && b.getDateFin().isBefore(maintenant)) return "EXPIREE";
        return "EN_LIGNE";
    }
}
