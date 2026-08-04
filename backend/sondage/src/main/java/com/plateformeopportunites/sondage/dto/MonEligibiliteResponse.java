package com.plateformeopportunites.sondage.dto;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;

@Data
@Builder
public class MonEligibiliteResponse {
    private Boolean aPasse;
    private Boolean estEligible;
    private BigDecimal tauxObtenu;
}
