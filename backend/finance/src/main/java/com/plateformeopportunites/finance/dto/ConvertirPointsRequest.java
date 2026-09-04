package com.plateformeopportunites.finance.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import java.math.BigDecimal;

@Data
public class ConvertirPointsRequest {
    @NotNull
    @DecimalMin(value = "100", message = "Minimum 100 points requis pour convertir")
    private BigDecimal montantPoints;
}
