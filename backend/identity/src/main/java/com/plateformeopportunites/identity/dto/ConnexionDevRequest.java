package com.plateformeopportunites.identity.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

@Data
public class ConnexionDevRequest {

    @NotBlank(message = "Le numéro de téléphone est requis")
    @Pattern(regexp = "^\\+[1-9]\\d{7,14}$", message = "Le numéro doit être au format international E.164")
    private String telephone;
}
