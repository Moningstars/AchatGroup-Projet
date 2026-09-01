package com.plateformeopportunites.identity.dto;

import com.plateformeopportunites.common.enums.StatutCommanditaire;
import lombok.Builder;
import lombok.Data;
import java.util.UUID;

@Data
@Builder
public class CommanditaireResponse {
    private UUID id;
    private String nom;
    private String prenom;
    private String societe;
    private String email;
    private String telephone;
    private StatutCommanditaire statut;
}
