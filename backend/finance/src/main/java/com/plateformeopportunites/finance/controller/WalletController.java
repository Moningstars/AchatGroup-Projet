package com.plateformeopportunites.finance.controller;

import com.plateformeopportunites.finance.dto.ConvertirPointsRequest;
import com.plateformeopportunites.finance.dto.PortefeuilleResponse;
import com.plateformeopportunites.finance.dto.RechargeRequest;
import com.plateformeopportunites.finance.dto.RetraitRequest;
import com.plateformeopportunites.finance.dto.TransactionResponse;
import com.plateformeopportunites.finance.service.WalletService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/wallet")
@RequiredArgsConstructor
@Tag(name = "Portefeuille", description = "Gestion du portefeuille participant (solde, recharge, retrait)")
public class WalletController {

    private final WalletService walletService;

    @Operation(summary = "Consulter son solde")
    @GetMapping("/solde")
    public ResponseEntity<PortefeuilleResponse> getSolde(Authentication auth) {
        return ResponseEntity.ok(walletService.getSolde(UUID.fromString(auth.getName())));
    }

    @Operation(summary = "Recharger son portefeuille")
    @PostMapping("/recharger")
    public ResponseEntity<PortefeuilleResponse> recharger(Authentication auth,
                                                           @Valid @RequestBody RechargeRequest req) {
        return ResponseEntity.ok(walletService.recharger(UUID.fromString(auth.getName()), req));
    }

    @Operation(summary = "Demander un retrait (montant gelé jusqu'à traitement)")
    @PostMapping("/retrait")
    public ResponseEntity<Void> demanderRetrait(Authentication auth,
                                                 @Valid @RequestBody RetraitRequest req) {
        walletService.demanderRetrait(UUID.fromString(auth.getName()), req);
        return ResponseEntity.ok().build();
    }

    @Operation(summary = "Historique des transactions")
    @GetMapping("/transactions")
    public ResponseEntity<List<TransactionResponse>> getTransactions(Authentication auth) {
        return ResponseEntity.ok(walletService.getTransactions(UUID.fromString(auth.getName())));
    }

    @Operation(summary = "Convertir des points en FCFA")
    @PostMapping("/convertir-points")
    public ResponseEntity<PortefeuilleResponse> convertirPoints(Authentication auth,
                                                                  @Valid @RequestBody ConvertirPointsRequest req) {
        return ResponseEntity.ok(walletService.convertirPoints(UUID.fromString(auth.getName()), req.getMontantPoints()));
    }
}
