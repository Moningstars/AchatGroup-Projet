package com.plateformeopportunites.sondage.dto;

import com.plateformeopportunites.common.enums.StatutValidation;
import lombok.Builder;
import lombok.Data;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
@Builder
public class ReponseAValiderDTO {
    private UUID id;
    private UUID participantId;
    private String participantNom;
    private String participantContact;
    private String fichierPreuve;
    private StatutValidation statutValidation;
    private LocalDateTime createdAt;
    private LocalDateTime valideeAt;
    private Boolean recompenseVersee;

    private List<DetailReponse> details;

    @Data
    @Builder
    public static class DetailReponse {
        private UUID questionId;
        private Integer ordre;
        private String question;
        private String reponse;
    }
}
