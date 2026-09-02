package com.plateformeopportunites.identity.dto;

import com.plateformeopportunites.common.enums.NiveauAcces;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class CreerAdminRequest {

    @NotBlank
    private String nom;

    @NotBlank
    @Email
    private String email;

    @NotBlank
    @Size(min = 8)
    private String motDePasse;

    private NiveauAcces niveauAcces;
}
