package com.plateformeopportunites.identity.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class CreerCommanditaireRequest {

    @NotBlank
    private String nom;

    @NotBlank
    private String prenom;

    @NotBlank @Email
    private String email;

    @NotBlank
    private String telephone;
}
