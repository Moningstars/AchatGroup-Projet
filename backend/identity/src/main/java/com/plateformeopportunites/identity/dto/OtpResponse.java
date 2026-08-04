package com.plateformeopportunites.identity.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class OtpResponse {

    private String message;

    // Retourné uniquement en mode développement.
    // À supprimer en production (le code est envoyé par SMS/email).
    private String codeDevMode;
}
