package com.plateformeopportunites.finance.dto;

import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class WalletPlateformeResponse {
    private UUID id;
    private BigDecimal soldePlateforme;
    private BigDecimal soldeReserve;
    private BigDecimal soldePoints;
    private BigDecimal tauxConversionPoints;
    private String devise;
    private LocalDateTime updatedAt;
}
