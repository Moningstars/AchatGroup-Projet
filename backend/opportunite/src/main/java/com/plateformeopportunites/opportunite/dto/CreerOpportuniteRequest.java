package com.plateformeopportunites.opportunite.dto;

import jakarta.validation.constraints.*;
import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
public class CreerOpportuniteRequest {

    @NotBlank
    private String titre;

    private String description;

    @NotNull
    @DecimalMin("0")
    private BigDecimal prixNormal;

    @NotNull
    @Min(1)
    private Integer seuilMinimum;

    @NotNull
    @Future
    private LocalDateTime dateExpiration;

    /** Nom de la catégorie (optionnel). Créée automatiquement si inconnue. */
    private String categorie;

    /** true = ACTIVE immédiatement, false (défaut) = BROUILLON */
    private boolean actif = true;

    @NotEmpty
    private List<PalierPrixRequest> paliers;

    @Data
    public static class PalierPrixRequest {
        @NotNull @Min(1)
        private Integer seuilMin;
        @NotNull @Min(1)
        private Integer seuilMax;
        @NotNull @DecimalMin("0")
        private BigDecimal prix;
    }
}
