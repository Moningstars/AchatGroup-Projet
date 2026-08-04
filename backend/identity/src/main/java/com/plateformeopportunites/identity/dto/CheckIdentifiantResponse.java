package com.plateformeopportunites.identity.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class CheckIdentifiantResponse {

    private boolean existe;
    private boolean aUnMotDePasse;
}
