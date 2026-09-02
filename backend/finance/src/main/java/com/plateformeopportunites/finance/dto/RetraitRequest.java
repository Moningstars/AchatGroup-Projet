package com.plateformeopportunites.finance.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import java.math.BigDecimal;

@Data
public class RetraitRequest {

    @NotNull
    @DecimalMin("1000")
    private BigDecimal montant;

    @NotBlank
    private String coordonnees; // numéro mobile money ou IBAN
}
