package com.plateformeopportunites.sondage.dto;

import com.plateformeopportunites.common.enums.TypeQuestion;
import lombok.Builder;
import lombok.Data;

import java.util.List;
import java.util.UUID;

@Data
@Builder
public class EligibiliteQuestionsResponse {

    private UUID id;
    private String titre;
    private Integer nombreQuestions;
    private List<QuestionEligibiliteResponse> questions;

    @Data
    @Builder
    public static class QuestionEligibiliteResponse {
        private UUID id;
        private Integer ordre;
        private String texte;
        private TypeQuestion typeQuestion;
        private Boolean obligatoire;
        private List<OptionEligibiliteResponse> options;
    }

    @Data
    @Builder
    public static class OptionEligibiliteResponse {
        private UUID id;
        private String libelle;
        private Integer ordre;
        // estCorrecte volontairement absent — ne pas exposer les réponses au client
    }
}
