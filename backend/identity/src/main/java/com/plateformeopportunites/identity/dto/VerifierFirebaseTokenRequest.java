package com.plateformeopportunites.identity.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class VerifierFirebaseTokenRequest {

    @NotBlank(message = "Le token Firebase est requis")
    private String idToken;
}
