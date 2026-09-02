package com.plateformeopportunites.finance.controller;

import com.plateformeopportunites.finance.dto.InitierRechargePaygateRequest;
import com.plateformeopportunites.finance.dto.InitierRechargePaygateResponse;
import com.plateformeopportunites.finance.dto.PaygateWebhookPayload;
import com.plateformeopportunites.finance.service.PaygateService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@Slf4j
@RestController
@RequiredArgsConstructor
@Tag(name = "PayGate", description = "Intégration paiement mobile PayGate Global")
public class PaygateController {

    private final PaygateService paygateService;

    @Operation(summary = "Indique si PayGate est en mode dev (test sans argent réel)")
    @GetMapping("/api/wallet/recharger/paygate/mode")
    public ResponseEntity<java.util.Map<String, Boolean>> getMode() {
        return ResponseEntity.ok(java.util.Map.of("devMode", paygateService.isDevMode()));
    }

    @Operation(summary = "Initier une recharge via PayGate (FLOOZ/TMONEY)")
    @PostMapping("/api/wallet/recharger/paygate")
    public ResponseEntity<InitierRechargePaygateResponse> initierRecharge(
            Authentication auth,
            @Valid @RequestBody InitierRechargePaygateRequest req) {
        UUID userId = UUID.fromString(auth.getName());
        InitierRechargePaygateResponse response = paygateService.initierRecharge(userId, req);
        return ResponseEntity.ok(response);
    }

    @Operation(summary = "Webhook de confirmation PayGate (endpoint public)")
    @PostMapping("/api/paiements/webhook/paygate")
    public ResponseEntity<Void> webhook(@RequestBody PaygateWebhookPayload payload) {
        log.info("Webhook PayGate reçu : identifier={}, txRef={}", payload.getIdentifier(), payload.getTxReference());
        paygateService.traiterWebhook(payload);
        return ResponseEntity.ok().build();
    }
}
