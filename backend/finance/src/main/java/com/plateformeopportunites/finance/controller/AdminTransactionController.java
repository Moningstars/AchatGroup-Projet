package com.plateformeopportunites.finance.controller;

import com.plateformeopportunites.finance.dto.TransactionResponse;
import com.plateformeopportunites.finance.service.WalletService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin/transactions")
@RequiredArgsConstructor
public class AdminTransactionController {

    private final WalletService walletService;

    @GetMapping
    public ResponseEntity<List<TransactionResponse>> lister() {
        return ResponseEntity.ok(walletService.listerToutesTransactions());
    }

    @GetMapping("/retraits/en-attente")
    public ResponseEntity<List<TransactionResponse>> retraitsEnAttente() {
        return ResponseEntity.ok(walletService.listerRetraitsEnAttente());
    }

    @PatchMapping("/retraits/{id}/approuver")
    public ResponseEntity<Void> approuver(@PathVariable UUID id) {
        walletService.approuverRetrait(id);
        return ResponseEntity.ok().build();
    }

    @PatchMapping("/retraits/{id}/rejeter")
    public ResponseEntity<Void> rejeter(@PathVariable UUID id) {
        walletService.rejeterRetrait(id);
        return ResponseEntity.ok().build();
    }
}
