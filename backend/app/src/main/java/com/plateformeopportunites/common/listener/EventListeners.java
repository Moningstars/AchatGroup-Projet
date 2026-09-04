package com.plateformeopportunites.common.listener;

import com.plateformeopportunites.common.event.QuotaAtteintEvent;
import com.plateformeopportunites.common.event.RemboursementEvent;
import com.plateformeopportunites.common.event.RetraitDemandeEvent;
import com.plateformeopportunites.opportunite.service.OpportuniteService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class EventListeners {

    private final OpportuniteService opportuniteService;

    @EventListener
    @Async
    public void onRemboursement(RemboursementEvent event) {
        log.info("Remboursement déclenché — opportunité {}", event.getOpportuniteId());
        try {
            opportuniteService.rembourserTous(event.getOpportuniteId());
            log.info("Remboursements effectués — opportunité {}", event.getOpportuniteId());
        } catch (Exception e) {
            log.error("Erreur remboursement — opportunité {}", event.getOpportuniteId(), e);
        }
    }

    @EventListener
    @Async
    public void onRetraitDemande(RetraitDemandeEvent event) {
        // En production : déclencher le paiement via Orange Money / MTN MoMo ici.
        log.info("Retrait demandé — participant {} : {} FCFA — en attente d'approbation admin",
                event.getParticipantId(), event.getMontant());
    }

    @EventListener
    @Async
    public void onQuotaAtteint(QuotaAtteintEvent event) {
        try {
            opportuniteService.notifierSeuilAtteint(event.getOpportuniteId());
        } catch (Exception e) {
            log.error("Erreur notification seuil atteint — opportunité {}", event.getOpportuniteId(), e);
        }
    }
}
