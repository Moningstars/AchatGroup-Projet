package com.plateformeopportunites.common.service;

import com.pusher.rest.Pusher;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class PusherNotificationService {

    private final Pusher pusher;

    public void notifierUtilisateur(UUID utilisateurId, String event, Map<String, Object> data) {
        String channel = "private-user-" + utilisateurId;
        try {
            pusher.trigger(channel, event, data);
            log.info("Pusher event '{}' envoyé sur {}", event, channel);
        } catch (Exception e) {
            log.error("Erreur envoi Pusher event '{}' : {}", event, e.getMessage());
        }
    }

    /** Notifie tous les admins connectés (canal partagé, pas de destinataire précis). */
    public void notifierAdmins(String event, Map<String, Object> data) {
        notifierTous("private-admin-global", event, data);
    }

    public void notifierTous(String channel, String event, Map<String, Object> data) {
        try {
            pusher.trigger(channel, event, data);
            log.info("Pusher event '{}' envoyé sur {}", event, channel);
        } catch (Exception e) {
            log.error("Erreur envoi Pusher event '{}' : {}", event, e.getMessage());
        }
    }
}
