package com.plateformeopportunites.identity.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class ChangerStatutCommanditaireRequest {
    @NotBlank(message = "Le motif est obligatoire") @Size(max = 500)
    private String motif;
}
