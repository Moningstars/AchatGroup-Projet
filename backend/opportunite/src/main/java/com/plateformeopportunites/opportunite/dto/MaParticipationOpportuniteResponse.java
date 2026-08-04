package com.plateformeopportunites.opportunite.dto;

import com.plateformeopportunites.common.enums.StatutOpportunite;
import com.plateformeopportunites.common.enums.StatutParticipation;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
public class MaParticipationOpportuniteResponse {
    private UUID id;
    private UUID opportuniteId;
    private String titre;
    private String categorie;
    private String imageUrl;
    private BigDecimal montantGele;
    private Integer quantite;
    private StatutParticipation statut;
    private LocalDateTime createdAt;
    private LocalDateTime dateExpiration;
    private StatutOpportunite statutOpportunite;
}
