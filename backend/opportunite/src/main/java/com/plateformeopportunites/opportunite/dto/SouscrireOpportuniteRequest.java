package com.plateformeopportunites.opportunite.dto;

import jakarta.validation.constraints.Min;
import lombok.Data;

import java.util.Map;
import java.util.UUID;

@Data
public class SouscrireOpportuniteRequest {
    @Min(1)
    private Integer quantite = 1;

    private UUID parrainId;

    private boolean utiliserPoints = false;

    private Map<String, String> reponsesComplementaires;
}
