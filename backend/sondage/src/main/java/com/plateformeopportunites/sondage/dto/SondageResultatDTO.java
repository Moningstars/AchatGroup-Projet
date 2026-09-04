package com.plateformeopportunites.sondage.dto;

import com.plateformeopportunites.common.enums.TypeQuestion;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Data
@Builder
public class SondageResultatDTO {
    private UUID sondageId;
    private String titre;
    private String commanditaireNom;
    private String commanditaireSociete;
    private Integer quotaVise;
    private Integer repondantsValides;
    private BigDecimal tauxCompletion;
    private BigDecimal budgetDistribue;
    private List<QuestionResultat> resultatsParQuestion;

    @Data
    @Builder
    public static class QuestionResultat {
        private UUID questionId;
        private Integer ordre;
        private String texte;
        private TypeQuestion typeQuestion;
        private List<OptionResultat> repartition;
        private List<String> verbatims;
    }

    @Data
    @Builder
    public static class OptionResultat {
        private UUID optionId;
        private String libelle;
        private long count;
        private BigDecimal pourcentage;
    }
}
