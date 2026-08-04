package com.plateformeopportunites.identity.dto;

import com.plateformeopportunites.common.enums.NiveauVerification;
import com.plateformeopportunites.common.enums.StatutCompte;
import lombok.Builder;
import lombok.Data;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
public class UtilisateurResponse {
    private UUID id;
    private String nom;
    private String telephone;
    private StatutCompte statut;
    private NiveauVerification niveauVerification;
    private Boolean profilComplete;
    private LocalDateTime createdAt;
}
