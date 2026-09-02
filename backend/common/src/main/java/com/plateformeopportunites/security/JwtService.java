package com.plateformeopportunites.security;

import com.plateformeopportunites.common.enums.NiveauAcces;
import com.plateformeopportunites.common.redis.RedisService;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;

@Service
public class JwtService {

    @Value("${app.jwt.secret-participant}")
    private String secretParticipant;

    @Value("${app.jwt.secret-admin}")
    private String secretAdmin;

    @Value("${app.jwt.expiration}")
    private long expiration;

    // Lazy pour éviter une dépendance circulaire potentielle avec le contexte Spring Security
    @Autowired
    @Lazy
    private RedisService redisService;

    // ── Génération ────────────────────────────────────────────────────────────

    public String generateParticipantToken(UUID id, String email) {
        return buildToken(id.toString(), email, "PARTICIPANT", secretParticipant);
    }

    public String generateAdminToken(UUID id, String email, NiveauAcces niveauAcces) {
        return Jwts.builder()
                .id(UUID.randomUUID().toString())
                .subject(id.toString())
                .claims(Map.of("email", email, "role", "ADMIN", "niveauAcces", niveauAcces.name()))
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + expiration))
                .signWith(getKey(secretAdmin))
                .compact();
    }

    private String buildToken(String subject, String email, String role, String secret) {
        return Jwts.builder()
                .id(UUID.randomUUID().toString())
                .subject(subject)
                .claims(Map.of("email", email, "role", role))
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + expiration))
                .signWith(getKey(secret))
                .compact();
    }

    // ── Validation ────────────────────────────────────────────────────────────

    public boolean validateParticipantToken(String token) {
        return !isExpired(token, secretParticipant);
    }

    public boolean validateAdminToken(String token) {
        return !isExpired(token, secretAdmin);
    }

    // ── Extraction ────────────────────────────────────────────────────────────

    public UUID extractParticipantId(String token) {
        return UUID.fromString(extractClaim(token, secretParticipant, Claims::getSubject));
    }

    public UUID extractAdminId(String token) {
        return UUID.fromString(extractClaim(token, secretAdmin, Claims::getSubject));
    }

    public String extractRole(String token, String secret) {
        return extractClaim(token, secret, claims -> claims.get("role", String.class));
    }

    public String extractNiveauAcces(String token) {
        return extractClaim(token, secretAdmin, claims -> claims.get("niveauAcces", String.class));
    }

    public String extractJti(String token, String secret) {
        return extractClaim(token, secret, Claims::getId);
    }

    public long extractExpiration(String token, String secret) {
        return extractClaim(token, secret, Claims::getExpiration).getTime();
    }

    // ── Blacklist (logout) ────────────────────────────────────────────────────

    public void blacklisterToken(String token) {
        String secret = detecterSecret(token);
        if (secret == null) return;
        String jti = extractJti(token, secret);
        long expirationMs = extractExpiration(token, secret);
        long ttlSeconds = (expirationMs - System.currentTimeMillis()) / 1000;
        if (ttlSeconds > 0) {
            redisService.blacklisterToken(jti, ttlSeconds);
        }
    }

    public boolean estBlackliste(String token) {
        String secret = detecterSecret(token);
        if (secret == null) return false;
        String jti = extractJti(token, secret);
        return redisService.estTokenBlackliste(jti);
    }

    // ── Utilitaires internes ──────────────────────────────────────────────────

    private String detecterSecret(String token) {
        try {
            extractClaim(token, secretParticipant, Claims::getSubject);
            return secretParticipant;
        } catch (Exception e) {
            try {
                extractClaim(token, secretAdmin, Claims::getSubject);
                return secretAdmin;
            } catch (Exception ex) {
                return null;
            }
        }
    }

    private boolean isExpired(String token, String secret) {
        return extractClaim(token, secret, Claims::getExpiration).before(new Date());
    }

    private <T> T extractClaim(String token, String secret, Function<Claims, T> resolver) {
        Claims claims = Jwts.parser()
                .verifyWith(getKey(secret))
                .build()
                .parseSignedClaims(token)
                .getPayload();
        return resolver.apply(claims);
    }

    private SecretKey getKey(String secret) {
        return Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
    }

    public String getSecretParticipant() { return secretParticipant; }
    public String getSecretAdmin()       { return secretAdmin; }
}
