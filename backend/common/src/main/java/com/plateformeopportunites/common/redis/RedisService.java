package com.plateformeopportunites.common.redis;

import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.util.UUID;
import java.util.concurrent.TimeUnit;

@Service
@RequiredArgsConstructor
public class RedisService {

    private final StringRedisTemplate redis;

    // ── Blacklist JWT ─────────────────────────────────────────────────────────

    public void blacklisterToken(String jti, long ttlSeconds) {
        if (ttlSeconds > 0) {
            redis.opsForValue().set("jwt:blacklist:" + jti, "1", ttlSeconds, TimeUnit.SECONDS);
        }
    }

    public boolean estTokenBlackliste(String jti) {
        return Boolean.TRUE.equals(redis.hasKey("jwt:blacklist:" + jti));
    }

    // ── Compteur participantsActuels ──────────────────────────────────────────

    public long incrementerParticipants(UUID opportuniteId, int delta) {
        Long val = redis.opsForValue().increment(cleCompteur(opportuniteId), delta);
        return val != null ? val : delta;
    }

    public Integer getParticipants(UUID opportuniteId) {
        String val = redis.opsForValue().get(cleCompteur(opportuniteId));
        return val != null ? Integer.parseInt(val) : null;
    }

    public void initialiserCompteurSiAbsent(UUID opportuniteId, int valeurDb) {
        redis.opsForValue().setIfAbsent(cleCompteur(opportuniteId), String.valueOf(valeurDb));
    }

    public void supprimerCompteur(UUID opportuniteId) {
        redis.delete(cleCompteur(opportuniteId));
    }

    private String cleCompteur(UUID opportuniteId) {
        return "opportunite:" + opportuniteId + ":participants";
    }

    // ── Marqueurs de notification one-shot (évite les doublons entre passages du scheduler) ──

    public boolean marquerNotificationSiAbsent(String cle, long ttlSeconds) {
        return Boolean.TRUE.equals(redis.opsForValue().setIfAbsent("notif:" + cle, "1", ttlSeconds, TimeUnit.SECONDS));
    }

    // ── Anti double-vote sondage ──────────────────────────────────────────────

    public boolean marquerVoteSiAbsent(UUID sondageId, UUID participantId, long ttlSeconds) {
        String key = "sondage:" + sondageId + ":voted:" + participantId;
        return Boolean.TRUE.equals(redis.opsForValue().setIfAbsent(key, "1", ttlSeconds, TimeUnit.SECONDS));
    }

    public boolean aDejaVote(UUID sondageId, UUID participantId) {
        return Boolean.TRUE.equals(redis.hasKey("sondage:" + sondageId + ":voted:" + participantId));
    }
}
