package com.plateformeopportunites.common.event;

import java.util.UUID;

public class UtilisateurCreeEvent {

    private final UUID utilisateurId;

    public UtilisateurCreeEvent(UUID utilisateurId) {
        this.utilisateurId = utilisateurId;
    }

    public UUID getUtilisateurId() {
        return utilisateurId;
    }
}
