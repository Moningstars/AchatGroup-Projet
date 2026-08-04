package com.plateformeopportunites.identity.dto;

import lombok.Builder;
import lombok.Data;
import java.util.UUID;

@Data
@Builder
public class AuthResponse {
    private String token;
    private UUID id;
    private String nom;
    private String email;
    private String telephone;
    private Boolean profilComplete;
    private String role;
    private String niveauAcces;
}
