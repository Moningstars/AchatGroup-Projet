package com.plateformeopportunites.opportunite.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
public class TentativeSouscriptionResponse {
    private UUID id;
    private UUID opportuniteId;
    private String opportuniteTitre;
    private UUID utilisateurId;
    private String utilisateurNom;
    private String utilisateurTelephone;
    private Integer quantite;
    private String motif;
    private String detail;
    private LocalDateTime createdAt;
}
