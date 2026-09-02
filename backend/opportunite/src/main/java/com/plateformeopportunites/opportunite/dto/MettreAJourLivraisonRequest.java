package com.plateformeopportunites.opportunite.dto;

import com.plateformeopportunites.common.enums.StatutLivraison;
import jakarta.validation.constraints.NotEmpty;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
public class MettreAJourLivraisonRequest {
    @NotEmpty
    private List<UUID> participationIds;

    private StatutLivraison statutLivraison;
    private Boolean prioriteTraitement;
    private LocalDateTime creneauTraitement;
    private LocalDateTime dateLivraisonPrevue;
    private String transporteur;
    private String referenceLivraison;
    private String adresseLivraison;
    private String noteTraitement;
    private String noteLivraison;
}

