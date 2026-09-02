package com.plateformeopportunites.sondage.dto;

import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
public class ModifierSondageRequest {
    private String titre;
    private String description;
    private Integer quotaVise;
    private BigDecimal recompense;
    private LocalDateTime dateExpiration;
}
