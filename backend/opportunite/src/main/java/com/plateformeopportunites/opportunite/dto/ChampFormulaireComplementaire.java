package com.plateformeopportunites.opportunite.dto;

import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.List;

@Data
public class ChampFormulaireComplementaire {
    @Size(max = 80)
    private String cle;

    @Size(max = 160)
    private String libelle;

    @Size(max = 500)
    private String aide;

    @Size(max = 30)
    private String type;

    private boolean obligatoire;

    private List<@Size(max = 120) String> options;
}
