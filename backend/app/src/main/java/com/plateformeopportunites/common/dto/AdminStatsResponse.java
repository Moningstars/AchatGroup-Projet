package com.plateformeopportunites.common.dto;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
public class AdminStatsResponse {

    // Opportunités
    private long totalOpportunites;
    private long opportunitesActives;
    private long opportunitesCloturees;
    private int  tauxRemplissageMoyen;

    // Sondages
    private long totalSondages;
    private long sondagesActifs;

    // Utilisateurs
    private long totalUtilisateurs;
    private long utilisateursActifs;

    // Finance
    private BigDecimal soldePlateforme;
    private long       retraitsEnAttente;

    // Graphique — inscriptions mensuelles (6 derniers mois)
    @Data
    @Builder
    public static class PointMensuel {
        private String mois;
        private long   inscrits;
    }

    private List<PointMensuel> inscriptionsMensuelles;
}
