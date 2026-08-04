package com.plateformeopportunites.sondage.dto;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import java.util.List;
import java.util.UUID;

@Data
public class EligibiliteRequest {

    @NotEmpty
    private List<ReponseEligibiliteRequest> reponses;

    @Data
    public static class ReponseEligibiliteRequest {
        @NotNull
        private UUID questionId;
        private UUID optionId;
        private String valeurTexte;
    }
}
