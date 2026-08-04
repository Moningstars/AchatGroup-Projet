package com.plateformeopportunites.finance.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import java.math.BigDecimal;

@Data
public class ModifierTauxConversionRequest {
    @NotNull
    @DecimalMin(value = "0.01", message = "Le taux doit être supérieur à 0")
    private BigDecimal tauxConversionPoints;
}
