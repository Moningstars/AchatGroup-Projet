package com.plateformeopportunites.finance.dto;

import com.plateformeopportunites.common.enums.StatutTransaction;
import com.plateformeopportunites.common.enums.TypeTransaction;
import lombok.Builder;
import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
public class TransactionResponse {
    private UUID id;
    private UUID utilisateurId;
    private TypeTransaction type;
    private BigDecimal montant;
    private StatutTransaction statut;
    private String reference;
    private String moyenPaiement;
    private String coordonnees;
    private LocalDateTime createdAt;
}
