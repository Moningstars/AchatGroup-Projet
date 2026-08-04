package com.plateformeopportunites.identity.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class InitierAuthResponse {

    /** "CONNEXION" si le numéro existe déjà, "INSCRIPTION" sinon */
    private String mode;

    private String message;

    /** Retourné uniquement en dev — à supprimer en production */
    private String codeDevMode;
}
