package com.plateformeopportunites.identity.controller;

import com.pusher.rest.Pusher;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/pusher")
@RequiredArgsConstructor
public class PusherAuthController {

    private final Pusher pusher;

    @PostMapping("/auth")
    public ResponseEntity<String> auth(
            @RequestParam("socket_id") String socketId,
            @RequestParam("channel_name") String channelName,
            Authentication authentication) {

        UUID utilisateurId = UUID.fromString(authentication.getName());
        String canalAttendu = "private-user-" + utilisateurId;

        // L'utilisateur ne peut s'abonner qu'à son propre canal
        if (!channelName.equals(canalAttendu)) {
            return ResponseEntity.status(403).body("Canal non autorisé");
        }

        String authResponse = pusher.authenticate(socketId, channelName);
        return ResponseEntity.ok(authResponse);
    }
}
