package com.plateformeopportunites.identity.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class AlimenterCommanditaireRequest {
    @NotNull
    @DecimalMin(value = "1.00", message = "Le montant doit être positif")
    private BigDecimal montant;
    @Size(max = 120)
    private String reference;
    @Size(max = 500)
    private String description;
}
