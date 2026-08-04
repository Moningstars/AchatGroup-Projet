package com.plateformeopportunites.identity.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class VerifierOtpRequest {

    @NotBlank
    private String identifiant;

    @NotBlank
    @Size(min = 6, max = 6, message = "Le code OTP doit contenir exactement 6 chiffres")
    private String code;
}
