package com.plateformeopportunites.identity.dto;

import com.plateformeopportunites.common.enums.StatutFournisseur;
import lombok.Builder;
import lombok.Data;
import java.util.UUID;

@Data
@Builder
public class FournisseurResponse {
    private UUID id;
    private String nom;
    private String societe;
    private String email;
    private String telephone;
    private String logoUrl;
    private String reseauxUrl;
    private StatutFournisseur statut;
}
