package com.plateformeopportunites.finance.dto;

import jakarta.validation.constraints.NotNull;
import lombok.*;
import java.math.BigDecimal;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class AjusterWalletRequest {

    @NotNull
    private BigDecimal montant; // positif = crédit, négatif = débit

    private String description;
}
