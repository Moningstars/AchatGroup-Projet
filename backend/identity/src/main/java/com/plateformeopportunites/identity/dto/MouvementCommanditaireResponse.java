package com.plateformeopportunites.identity.dto;

import lombok.Builder;
import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Data @Builder
public class MouvementCommanditaireResponse {
    private UUID id;
    private String type;
    private BigDecimal montant;
    private BigDecimal soldeApres;
    private UUID sondageId;
    private String reference;
    private String description;
    private LocalDateTime createdAt;
}
