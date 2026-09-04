package com.plateformeopportunites.sondage.dto;

import com.plateformeopportunites.common.enums.ModeDistribution;
import com.plateformeopportunites.common.enums.NiveauVerification;
import com.plateformeopportunites.common.enums.TypeQuestion;
import com.plateformeopportunites.common.enums.TypeRecompense;
import jakarta.validation.constraints.*;
import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
public class CreerSondageRequest {

    private UUID commanditaireId;

    @NotBlank(message = "Le titre est obligatoire")
    @Size(max = 255)
    private String titre;

    private String imageUrl;

    private String description;

    @NotNull @Min(1)
    private Integer quotaVise;

    @NotNull @DecimalMin("0")
    private BigDecimal recompense;

    @NotNull
    private TypeRecompense typeRecompense;

    @NotNull @DecimalMin("0") @DecimalMax("100")
    private BigDecimal seuilEligibilite;

    @NotNull
    private NiveauVerification niveauVerification;

    @NotNull
    private ModeDistribution modeDistribution;

    @NotNull @Future
    private LocalDateTime dateExpiration;

    @NotEmpty
    private List<QuestionRequest> questions;

    @Data
    public static class QuestionRequest {
        @NotNull private Integer ordre;
        @NotNull private TypeQuestion typeQuestion;
        @NotBlank private String texte;
        @NotNull private Boolean obligatoire;
        private List<OptionRequest> options;
    }

    @Data
    public static class OptionRequest {
        @NotBlank private String libelle;
        @NotNull private Integer ordre;
    }
}
