package com.plateformeopportunites.identity.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class ConnexionRequest {

    @NotBlank
    private String identifiant; // email ou téléphone

    @NotBlank
    private String motDePasse;
}
