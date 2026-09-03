package com.plateformeopportunites.sondage.dto;

import com.plateformeopportunites.common.enums.TypeQuestion;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.NotEmpty;
import lombok.Data;
import java.util.List;

@Data
public class CreerEligibiliteRequest {

    @NotBlank
    private String titre;

    @NotEmpty
    private List<QuestionEligibiliteRequest> questions;

    @Data
    public static class QuestionEligibiliteRequest {
        @NotBlank
        private String texte;
        @NotNull
        private TypeQuestion typeQuestion;
        @NotNull
        private Integer ordre;
        private Boolean obligatoire = true;
        @NotEmpty
        private List<OptionEligibiliteRequest> options;
    }

    @Data
    public static class OptionEligibiliteRequest {
        @NotBlank
        private String libelle;
        @NotNull
        private Integer ordre;
        @NotNull
        private Boolean estCorrecte;
    }
}
