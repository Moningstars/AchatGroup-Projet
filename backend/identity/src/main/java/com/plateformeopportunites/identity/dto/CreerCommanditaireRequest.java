package com.plateformeopportunites.identity.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class CreerCommanditaireRequest {

    @NotBlank @Size(max = 100)
    private String nom;

    @NotBlank @Size(max = 100)
    private String prenom;

    @NotBlank @Size(max = 150)
    private String societe;

    @NotBlank @Email @Size(max = 255)
    private String email;

    @NotBlank @Pattern(regexp = "^\\+[0-9\\s().-]{8,22}$", message = "Le téléphone doit être au format international, par exemple +228 90 00 00 00")
    private String telephone;
}
