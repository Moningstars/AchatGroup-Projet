package com.plateformeopportunites.identity.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class CreerFournisseurRequest {
    @NotBlank private String nom;
    private String societe;
    @NotBlank @Email private String email;
    @NotBlank private String telephone;
    private String logoUrl;
    private String reseauxUrl;
}
