package com.plateformeopportunites.finance.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import lombok.Data;
import java.math.BigDecimal;

@Data
public class InitierRechargePaygateRequest {

    @NotNull
    @DecimalMin("500")
    private BigDecimal montant;

    @NotBlank
    @Pattern(regexp = "FLOOZ|TMONEY", message = "network doit être FLOOZ ou TMONEY")
    private String network;

    @NotBlank
    private String telephone;
}
