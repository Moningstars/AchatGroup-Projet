package com.plateformeopportunites.sondage.dto;

import lombok.Data;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
public class ModifierSondageRequest {
    @Size(min = 1, max = 255)
    private String titre;
    private String description;
    @Min(1)
    private Integer quotaVise;
    @DecimalMin("0")
    private BigDecimal recompense;
    @Future
    private LocalDateTime dateExpiration;
}
