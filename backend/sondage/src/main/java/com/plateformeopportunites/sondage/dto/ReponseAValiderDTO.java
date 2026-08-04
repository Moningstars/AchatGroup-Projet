package com.plateformeopportunites.sondage.dto;

import com.plateformeopportunites.common.enums.StatutValidation;
import lombok.Builder;
import lombok.Data;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
public class ReponseAValiderDTO {
    private UUID id;
    private String participantNom;
    private String participantContact;
    private StatutValidation statutValidation;
    private LocalDateTime createdAt;
    private LocalDateTime valideeAt;
    private Boolean recompenseVersee;
}
