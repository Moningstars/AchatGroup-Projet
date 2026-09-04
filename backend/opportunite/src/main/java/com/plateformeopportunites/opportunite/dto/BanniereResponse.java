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
    private LocalDateTime dateDebut;
    private LocalDateTime dateFin;
    private LocalDateTime createdAt;

    public static BanniereResponse from(Banniere b) {
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
                .dateDebut(b.getDateDebut())
                .dateFin(b.getDateFin())
                .createdAt(b.getCreatedAt())
                .build();
    }
}
