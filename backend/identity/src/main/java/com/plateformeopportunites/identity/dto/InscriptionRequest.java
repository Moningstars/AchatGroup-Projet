package com.plateformeopportunites.identity.dto;

import com.plateformeopportunites.common.enums.OperateurMobile;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class InscriptionRequest {

    @NotBlank
    private String nom;

    @NotBlank
    @Email
    private String email;

    @NotBlank
    private String telephone;

    @NotBlank
    private String motDePasse;

    @NotNull
    private OperateurMobile operateurMobile;
}
