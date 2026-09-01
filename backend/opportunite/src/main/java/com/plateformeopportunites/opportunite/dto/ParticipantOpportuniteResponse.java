package com.plateformeopportunites.opportunite.dto;

import com.plateformeopportunites.common.enums.StatutParticipation;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
public class ParticipantOpportuniteResponse {
    private UUID id;
    private UUID utilisateurId;
    private String nom;
    private String telephone;
    private Integer quantite;
    private BigDecimal montantGele;
    private StatutParticipation statut;
    private LocalDateTime createdAt;
}
