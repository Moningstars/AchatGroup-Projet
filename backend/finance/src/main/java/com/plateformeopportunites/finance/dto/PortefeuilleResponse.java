package com.plateformeopportunites.finance.dto;

import lombok.Builder;
import lombok.Data;
import java.math.BigDecimal;
import java.util.UUID;

@Data
@Builder
public class PortefeuilleResponse {
    private UUID id;
    private BigDecimal soldeDisponible;
    private BigDecimal soldeGele;
    private BigDecimal soldePoints;
    private BigDecimal valeurPointFcfa;
    private BigDecimal recompenseParrainagePoints;
    private String devise;
}
