package com.plateformeopportunites.sondage.dto;

import com.plateformeopportunites.common.enums.*;
import lombok.Builder;
import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
@Builder
public class SondageResponse {
    private UUID id;
    private UUID commanditaireId;
    private String commanditaireNom;
    private String commanditaireSociete;
    private String titre;
    private String description;
    private Integer quotaVise;
    private Integer repondantsActuels;
    private BigDecimal recompense;
    private TypeRecompense typeRecompense;
    private BigDecimal seuilEligibilite;
    private NiveauVerification niveauVerification;
    private ModeDistribution modeDistribution;
    private LocalDateTime dateExpiration;
    private StatutSondage statut;
    private BigDecimal budgetReserve;
    private BigDecimal budgetDistribue;
    private LocalDateTime createdAt;
    private List<QuestionResponse> questions;
    private boolean hasEligibilite;

    @Data
    @Builder
    public static class QuestionResponse {
        private UUID id;
        private Integer ordre;
        private TypeQuestion typeQuestion;
        private String texte;
        private Boolean obligatoire;
        private List<OptionResponse> options;
    }

    @Data
    @Builder
    public static class OptionResponse {
        private UUID id;
        private String libelle;
        private Integer ordre;
    }
}
