package com.plateformeopportunites.identity.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class InitierRequest {

    @NotBlank(message = "Email ou numéro de téléphone requis")
    private String identifiant; // email ou téléphone
}
