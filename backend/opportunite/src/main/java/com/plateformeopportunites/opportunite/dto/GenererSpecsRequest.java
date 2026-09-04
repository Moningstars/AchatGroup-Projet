package com.plateformeopportunites.opportunite.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class GenererSpecsRequest {

    @NotBlank
    private String titre;

    private String description;

    private String categorie;
}
