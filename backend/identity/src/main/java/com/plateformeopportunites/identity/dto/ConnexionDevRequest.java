package com.plateformeopportunites.identity.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class ConnexionDevRequest {

    @NotBlank(message = "Le numéro de téléphone est requis")
    private String telephone;
}
