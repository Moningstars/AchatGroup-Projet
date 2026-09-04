package com.plateformeopportunites.finance.controller;

import com.plateformeopportunites.finance.dto.AjusterWalletRequest;
import com.plateformeopportunites.finance.dto.AlimenterWalletRequest;
import com.plateformeopportunites.finance.dto.ModifierTauxConversionRequest;
import com.plateformeopportunites.finance.dto.PortefeuilleResponse;
import com.plateformeopportunites.finance.dto.WalletPlateformeResponse;
import com.plateformeopportunites.finance.service.WalletService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;
import java.math.BigDecimal;

@RestController
@RequestMapping("/api/admin/wallet")
@RequiredArgsConstructor
public class AdminWalletController {

    private final WalletService walletService;

    @GetMapping
    public ResponseEntity<WalletPlateformeResponse> getWallet() {
        return ResponseEntity.ok(walletService.getWalletPlateformeDetails());
    }

    @PostMapping("/alimenter")
    public ResponseEntity<WalletPlateformeResponse> alimenter(@Valid @RequestBody AlimenterWalletRequest req) {
        return ResponseEntity.ok(walletService.alimenter(req));
    }

    @PatchMapping("/taux-conversion")
    public ResponseEntity<WalletPlateformeResponse> modifierTauxConversion(
            @Valid @RequestBody ModifierTauxConversionRequest req) {
        return ResponseEntity.ok(walletService.modifierTauxConversion(req.getTauxConversionPoints()));
    }

    @PatchMapping("/parrainage")
    public ResponseEntity<WalletPlateformeResponse> modifierParrainage(@RequestBody java.util.Map<String, BigDecimal> req) {
        return ResponseEntity.ok(walletService.modifierRecompenseParrainage(req.get("recompenseParrainagePoints")));
    }

    @PatchMapping("/utilisateurs/{id}/ajuster")
    public ResponseEntity<PortefeuilleResponse> ajusterSolde(@PathVariable UUID id,
                                                              @Valid @RequestBody AjusterWalletRequest req) {
        return ResponseEntity.ok(walletService.ajusterSolde(id, req.getMontant(), req.getDescription()));
    }
}
