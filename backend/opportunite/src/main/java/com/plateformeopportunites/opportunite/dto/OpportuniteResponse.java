package com.plateformeopportunites.opportunite.dto;

import com.plateformeopportunites.common.enums.StatutOpportunite;
import lombok.Builder;
import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
@Builder
public class OpportuniteResponse {
    private UUID id;
    private String titre;
    private String description;
    private BigDecimal prixNormal;
    private BigDecimal prixActuel;
    private Integer seuilMinimum;
    private Integer participantsActuels;
    private LocalDateTime dateExpiration;
    private StatutOpportunite statut;
    private LocalDateTime createdAt;
    private String categorie;
    private String categorieIcone;
    private List<PalierPrixResponse> paliers;
    private List<ImageResponse> images;

    @Data
    @Builder
    public static class PalierPrixResponse {
        private UUID id;
        private Integer seuilMin;
        private Integer seuilMax;
        private BigDecimal prix;
    }

    @Data
    @Builder
    public static class ImageResponse {
        private UUID id;
        private String url;
        private String legende;
        private Integer ordre;
    }
}
