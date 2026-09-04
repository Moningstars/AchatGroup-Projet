package com.plateformeopportunites.identity.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class CompleterProfilRequest {

    @NotBlank(message = "Le nom est requis")
    private String nom;
}
