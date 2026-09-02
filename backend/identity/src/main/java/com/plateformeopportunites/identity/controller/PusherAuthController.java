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

        boolean estAdmin = authentication.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));

        boolean autorise;
        if (estAdmin) {
            // Canal partagé entre tous les admins — pas d'ID personnel dans le nom du canal
            autorise = channelName.equals("private-admin-global");
        } else {
            UUID utilisateurId = UUID.fromString(authentication.getName());
            autorise = channelName.equals("private-user-" + utilisateurId);
        }

        if (!autorise) {
            return ResponseEntity.status(403).body("Canal non autorisé");
        }

        String authResponse = pusher.authenticate(socketId, channelName);
        return ResponseEntity.ok(authResponse);
    }
}
