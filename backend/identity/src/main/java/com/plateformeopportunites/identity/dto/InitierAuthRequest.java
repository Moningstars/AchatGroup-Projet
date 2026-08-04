package com.plateformeopportunites.identity.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class InitierAuthRequest {

    @NotBlank(message = "L'indicatif téléphonique est requis")
    private String indicatif; // ex: "+228"

    @NotBlank(message = "Le numéro de téléphone est requis")
    private String telephone; // ex: "90123456"
}
