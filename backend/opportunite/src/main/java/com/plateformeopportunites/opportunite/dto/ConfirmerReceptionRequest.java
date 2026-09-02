package com.plateformeopportunites.opportunite.dto;

import lombok.Data;

@Data
public class ConfirmerReceptionRequest {
    private Boolean recu = true;
    private String commentaire;
}

