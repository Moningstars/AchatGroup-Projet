package com.plateformeopportunites.finance.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.*;
import java.math.BigDecimal;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class AlimenterWalletRequest {

    @NotNull
    @DecimalMin(value = "1")
    private BigDecimal montant;

    private String description;
}
