package com.plateformeopportunites.sondage.dto;

import com.plateformeopportunites.common.enums.StatutValidation;
import com.plateformeopportunites.common.enums.StatutSondage;
import com.plateformeopportunites.common.enums.ModeDistribution;
import com.plateformeopportunites.common.enums.TypeRecompense;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
public class MaParticipationSondageResponse {
    private UUID id;
    private UUID sondageId;
    private String titre;
    private BigDecimal recompense;
    private TypeRecompense typeRecompense;
    private StatutValidation statutValidation;
    private StatutSondage statutSondage;
    private ModeDistribution modeDistribution;
    private Boolean recompenseVersee;
    private LocalDateTime createdAt;
    private LocalDateTime valideeAt;
    private LocalDateTime dateExpiration;
}
