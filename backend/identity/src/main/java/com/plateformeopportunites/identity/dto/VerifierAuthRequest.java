package com.plateformeopportunites.identity.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class VerifierAuthRequest {

    /** Numéro complet avec indicatif, ex: "+22890123456" */
    @NotBlank(message = "Le numéro de téléphone est requis")
    private String telephone;

    @NotBlank(message = "Le code OTP est requis")
    private String code;
}
