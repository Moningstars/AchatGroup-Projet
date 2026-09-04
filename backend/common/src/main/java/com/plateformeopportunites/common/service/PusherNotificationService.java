package com.plateformeopportunites.common.service;

import com.pusher.pushnotifications.PushNotifications;
import com.pusher.rest.Pusher;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class PusherNotificationService {

    private static final String INTERET_ADMIN = "admin-global";

    private final Pusher pusher;
    private final Optional<PushNotifications> pushNotifications;

    public void notifierUtilisateur(UUID utilisateurId, String event, Map<String, Object> data) {
        String channel = "private-user-" + utilisateurId;
        try {
            pusher.trigger(channel, event, data);
            log.info("Pusher event '{}' envoyé sur {}", event, channel);
        } catch (Exception e) {
            log.error("Erreur envoi Pusher event '{}' : {}", event, e.getMessage());
        }
        pousserVersUtilisateur(utilisateurId, event, data);
    }

    public void notifierAdmins(String event, Map<String, Object> data) {
        notifierTous("private-admin-global", event, data);
        pousserVersInteret(INTERET_ADMIN, event, data);
    }

    public void notifierTous(String channel, String event, Map<String, Object> data) {
        try {
            pusher.trigger(channel, event, data);
            log.info("Pusher event '{}' envoyé sur {}", event, channel);
        } catch (Exception e) {
            log.error("Erreur envoi Pusher event '{}' : {}", event, e.getMessage());
        }
    }

    private void pousserVersUtilisateur(UUID utilisateurId, String type, Map<String, Object> data) {
        String[] message = messagePush(type, data);
        if (message == null) return;
        pushNotifications.ifPresent(beams -> {
            try {
                beams.publishToUsers(List.of(utilisateurId.toString()), publishRequest(message[0], message[1]));
            } catch (Exception e) {
                log.error("Erreur envoi Beams utilisateur {} : {}", utilisateurId, e.getMessage());
            }
        });
    }

    private void pousserVersInteret(String interet, String type, Map<String, Object> data) {
        String[] message = messagePush(type, data);
        if (message == null) return;
        pushNotifications.ifPresent(beams -> {
            try {
                beams.publishToInterests(List.of(interet), publishRequest(message[0], message[1]));
            } catch (Exception e) {
                log.error("Erreur envoi Beams intérêt {} : {}", interet, e.getMessage());
            }
        });
    }

    @SuppressWarnings({"unchecked", "rawtypes"})
    private Map<String, Map> publishRequest(String titre, String corps) {
        Map<String, String> notification = new HashMap<>();
        notification.put("title", titre);
        notification.put("body", corps);

        Map<String, Object> fcm = new HashMap<>();
        fcm.put("notification", notification);

        Map<String, Object> apnsAlert = new HashMap<>();
        apnsAlert.put("title", titre);
        apnsAlert.put("body", corps);
        Map<String, Object> apnsAps = new HashMap<>();
        apnsAps.put("alert", apnsAlert);
        Map<String, Object> apns = new HashMap<>();
        apns.put("aps", apnsAps);

        Map<String, Map> publishRequest = new HashMap<>();
        publishRequest.put("fcm", (Map) fcm);
        publishRequest.put("apns", (Map) apns);
        return publishRequest;
    }

    private String[] messagePush(String type, Map<String, Object> data) {
        return switch (type) {
            case "wallet.credited" -> new String[]{"Portefeuille crédité", data.get("montant") + " FCFA ajoutés à votre solde."};
            case "wallet.debited" -> new String[]{"Portefeuille débité", data.get("montant") + " FCFA retirés de votre solde."};
            case "KYC" -> new String[]{"Vérification d'identité",
                    "VERIFIE".equals(data.get("statut")) ? "Votre identité a été vérifiée." : "Votre demande a été rejetée."};
            case "RETRAIT" -> new String[]{"Retrait",
                    "APPROUVE".equals(data.get("statut")) ? "Votre retrait a été approuvé." : "Votre retrait a été rejeté."};
            case "RECOMPENSE" -> new String[]{"Récompense reçue",
                    "Vous avez reçu " + data.get("montant") + ("POINTS".equals(data.get("type")) ? " points." : " FCFA.")};
            case "OPPORTUNITE_VALIDEE" -> new String[]{"Achat groupé validé", "\"" + data.get("titre") + "\" a atteint son seuil minimum."};
            case "OPPORTUNITE_ECHEC" -> new String[]{"Opportunité annulée", "\"" + data.get("titre") + "\" n'a pas atteint son seuil."};
            case "OPPORTUNITE_EXPIRATION_PROCHE" -> new String[]{"Expire bientôt", "\"" + data.get("titre") + "\" expire sous 24h."};
            case "KYC_SOUMIS" -> new String[]{"Nouvelle demande KYC", "Une vérification d'identité est à traiter."};
            case "RETRAIT_DEMANDE" -> new String[]{"Nouvelle demande de retrait", data.get("montant") + " FCFA à traiter."};
            case "OPPORTUNITE_PRESQUE_COMPLETE" -> new String[]{"Opportunité presque complète", "\"" + data.get("titre") + "\" approche son plafond."};
            case "OPPORTUNITE_RISQUE_ECHEC" -> new String[]{"Risque d'échec", "\"" + data.get("titre") + "\" expire bientôt sans atteindre son seuil."};
            case "SONDAGE_BUDGET_PRESQUE_EPUISE" -> new String[]{"Budget sondage presque épuisé", "\"" + data.get("titre") + "\" a distribué 80% de son budget."};
            default -> null;
        };
    }
}
