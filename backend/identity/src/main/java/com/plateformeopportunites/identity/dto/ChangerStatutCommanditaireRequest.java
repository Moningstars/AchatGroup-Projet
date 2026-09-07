package com.plateformeopportunites.identity.dto;

import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class ChangerStatutCommanditaireRequest {
    @Size(max = 500)
    private String motif;
}
