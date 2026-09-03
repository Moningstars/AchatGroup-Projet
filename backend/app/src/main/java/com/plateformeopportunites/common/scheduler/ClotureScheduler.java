package com.plateformeopportunites.common.scheduler;

import com.plateformeopportunites.common.enums.StatutOpportunite;
import com.plateformeopportunites.common.redis.RedisService;
import com.plateformeopportunites.opportunite.repository.OpportuniteRepository;
import com.plateformeopportunites.opportunite.service.OpportuniteService;
import com.plateformeopportunites.sondage.service.SondageService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@EnableScheduling
@RequiredArgsConstructor
@Slf4j
public class ClotureScheduler {

    private final OpportuniteService opportuniteService;
    private final SondageService sondageService;
    private final OpportuniteRepository opportuniteRepository;
    private final RedisService redisService;

    @Scheduled(fixedDelay = 60_000)
    public void cloturerOpportunitesExpirees() {
        log.debug("Job clôture opportunités — début");
        try {
            opportuniteService.cloturerExpirees();
        } catch (Exception e) {
            log.error("Erreur clôture opportunités", e);
        }
    }

    // Prévient les participants (et l'admin si le seuil minimum n'est pas atteint) des
    // opportunités qui expirent sous 24h — une seule fois par opportunité (marqueur Redis).
    @Scheduled(fixedDelay = 3_600_000)
    public void notifierOpportunitesExpirationProche() {
        log.debug("Job notification expirations proches — début");
        try {
            opportuniteService.notifierExpirationsProches();
        } catch (Exception e) {
            log.error("Erreur notification expirations proches", e);
        }
    }

    @Scheduled(fixedDelay = 900_000)
    public void notifierConfirmationsReceptionEnRetard() {
        try {
            opportuniteService.notifierRetardsLivraison();
        } catch (Exception e) {
            log.error("Erreur notification des confirmations de réception en retard", e);
        }
    }

    @Scheduled(fixedDelay = 60_000)
    public void cloturerSondagesExpires() {
        log.debug("Job clôture sondages — début");
        try {
            sondageService.cloturerExpires();
        } catch (Exception e) {
            log.error("Erreur clôture sondages", e);
        }
    }

    // Synchronise les compteurs Redis → PostgreSQL toutes les 5 minutes.
    // Garantit la cohérence si Redis redémarre entre deux souscriptions.
    @Scheduled(fixedDelay = 300_000)
    public void syncCompteursRedisVersDb() {
        log.debug("Job sync compteurs Redis → DB — début");
        try {
            opportuniteRepository.findByStatut(StatutOpportunite.ACTIVE).forEach(opp -> {
                Integer compteurRedis = redisService.getParticipants(opp.getId());
                if (compteurRedis != null && !compteurRedis.equals(opp.getParticipantsActuels())) {
                    opp.setParticipantsActuels(compteurRedis);
                    opportuniteRepository.save(opp);
                    log.debug("Sync opportunité {} : {} → {}", opp.getId(),
                            opp.getParticipantsActuels(), compteurRedis);
                }
            });
        } catch (Exception e) {
            log.error("Erreur sync compteurs Redis → DB", e);
        }
    }
}
