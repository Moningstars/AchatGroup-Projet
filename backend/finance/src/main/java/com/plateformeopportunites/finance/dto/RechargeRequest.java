package com.plateformeopportunites.finance.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import java.math.BigDecimal;

@Data
public class RechargeRequest {

    @NotNull
    @DecimalMin("500")
    private BigDecimal montant;

    @NotBlank
    private String moyenPaiement;

    private String reference;
}
