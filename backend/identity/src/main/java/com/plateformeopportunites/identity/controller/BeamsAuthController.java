package com.plateformeopportunites.identity.controller;

import com.pusher.pushnotifications.PushNotifications;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * Authentifie un participant pour Pusher Beams (notifications push navigateur/mobile),
 * afin qu'on puisse cibler ses notifications avec pushNotifications.publishToUsers(...).
 */
@RestController
@RequestMapping("/api/beams-auth")
@RequiredArgsConstructor
public class BeamsAuthController {

    private final PushNotifications pushNotifications;

    @GetMapping
    public ResponseEntity<Map<String, Object>> auth(
            @RequestParam("user_id") String userId,
            Authentication authentication) {

        // Un utilisateur ne peut générer un token Beams que pour lui-même
        if (!userId.equals(authentication.getName())) {
            return ResponseEntity.status(403).build();
        }

        return ResponseEntity.ok(pushNotifications.generateToken(userId));
    }
}
