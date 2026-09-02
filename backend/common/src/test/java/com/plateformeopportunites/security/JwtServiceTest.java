package com.plateformeopportunites.security;

import com.plateformeopportunites.security.JwtService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

class JwtServiceTest {

    private JwtService jwtService;

    private static final String SECRET_PARTICIPANT = "secret_participant_very_long_key_min_256_bits_change_this";
    private static final String SECRET_ADMIN = "secret_admin_very_long_key_min_256_bits_change_this_xxxxx";
    private static final long EXPIRATION = 86400000L;

    @BeforeEach
    void setUp() {
        jwtService = new JwtService();
        ReflectionTestUtils.setField(jwtService, "secretParticipant", SECRET_PARTICIPANT);
        ReflectionTestUtils.setField(jwtService, "secretAdmin", SECRET_ADMIN);
        ReflectionTestUtils.setField(jwtService, "expiration", EXPIRATION);
    }

    @Test
    void generateParticipantToken_tokenValideEtExtractableId() {
        UUID id = UUID.randomUUID();
        String token = jwtService.generateParticipantToken(id, "user@test.tg");

        assertNotNull(token);
        assertTrue(jwtService.validateParticipantToken(token));
        assertEquals(id, jwtService.extractParticipantId(token));
    }

    @Test
    void generateAdminToken_tokenValideEtExtractableId() {
        UUID id = UUID.randomUUID();
        String token = jwtService.generateAdminToken(id, "admin@test.tg", com.plateformeopportunites.common.enums.NiveauAcces.SUPER_ADMIN);

        assertNotNull(token);
        assertTrue(jwtService.validateAdminToken(token));
        assertEquals(id, jwtService.extractAdminId(token));
    }

    @Test
    void extractRole_participantToken_retourneParticipant() {
        String token = jwtService.generateParticipantToken(UUID.randomUUID(), "user@test.tg");
        assertEquals("PARTICIPANT", jwtService.extractRole(token, SECRET_PARTICIPANT));
    }

    @Test
    void extractRole_adminToken_retourneAdmin() {
        String token = jwtService.generateAdminToken(UUID.randomUUID(), "admin@test.tg", com.plateformeopportunites.common.enums.NiveauAcces.SUPER_ADMIN);
        assertEquals("ADMIN", jwtService.extractRole(token, SECRET_ADMIN));
    }

    @Test
    void participantToken_invalideAvecSecretAdmin() {
        String token = jwtService.generateParticipantToken(UUID.randomUUID(), "user@test.tg");
        assertThrows(Exception.class, () -> jwtService.extractAdminId(token));
    }

    @Test
    void adminToken_invalideAvecSecretParticipant() {
        String token = jwtService.generateAdminToken(UUID.randomUUID(), "admin@test.tg", com.plateformeopportunites.common.enums.NiveauAcces.SUPER_ADMIN);
        assertThrows(Exception.class, () -> jwtService.extractParticipantId(token));
    }
}
