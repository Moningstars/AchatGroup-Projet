package com.plateformeopportunites.sondage.dto;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import java.util.List;
import java.util.UUID;

@Data
public class RepondreRequest {

    @NotEmpty
    private List<ReponseDetailRequest> reponses;

    @Data
    public static class ReponseDetailRequest {
        @NotNull
        private UUID questionId;
        private UUID optionReponseId;
        private String valeurTexte;
    }
}
