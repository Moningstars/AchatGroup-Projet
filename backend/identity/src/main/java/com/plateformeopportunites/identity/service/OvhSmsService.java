package com.plateformeopportunites.identity.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.List;
import java.util.Map;

/**
 * Envoi de SMS via l'API REST OVHcloud (pas de SDK Java maintenu côté OVH,
 * cf. docs.ovhcloud.com — les appels se font directement en HTTP signé).
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class OvhSmsService {

    private final ObjectMapper objectMapper;

    @Value("${ovh.sms.endpoint}")
    private String endpoint;

    @Value("${ovh.sms.service-name:}")
    private String serviceName;

    @Value("${ovh.sms.application-key:}")
    private String applicationKey;

    @Value("${ovh.sms.application-secret:}")
    private String applicationSecret;

    @Value("${ovh.sms.consumer-key:}")
    private String consumerKey;

    @Value("${ovh.sms.dev-mode:true}")
    private boolean devMode;

    public void envoyer(String telephone, String message) {
        if (devMode) {
            log.warn("[DEV-MODE] SMS OVH simulé vers {} : {}", telephone, message);
            return;
        }

        if (serviceName.isBlank() || applicationKey.isBlank() || applicationSecret.isBlank() || consumerKey.isBlank()) {
            log.error("OVH SMS non configuré (clés manquantes) — SMS non envoyé à {}", telephone);
            return;
        }

        String url = endpoint + "/sms/" + serviceName + "/jobs";

        try {
            Map<String, Object> payload = Map.of(
                    "receivers", List.of(telephone),
                    "message", message,
                    "priority", "high",
                    "noStopClause", true,
                    "senderForResponse", false
            );
            String jsonBody = objectMapper.writeValueAsString(payload);
            long timestamp = System.currentTimeMillis() / 1000;
            String signature = signer(applicationSecret, consumerKey, "POST", url, jsonBody, timestamp);

            HttpClient client = HttpClient.newHttpClient();
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .header("Content-Type", "application/json")
                    .header("X-Ovh-Application", applicationKey)
                    .header("X-Ovh-Consumer", consumerKey)
                    .header("X-Ovh-Signature", signature)
                    .header("X-Ovh-Timestamp", String.valueOf(timestamp))
                    .POST(HttpRequest.BodyPublishers.ofString(jsonBody))
                    .build();

            HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() != 200) {
                log.error("Échec envoi SMS OVH vers {} (HTTP {}) : {}", telephone, response.statusCode(), response.body());
                return;
            }

            JsonNode json = objectMapper.readTree(response.body());
            int invalides = json.path("invalidReceivers").size();
            if (invalides > 0) {
                log.warn("Numéro rejeté par OVH SMS : {}", telephone);
            } else {
                log.info("SMS OVH envoyé à {} ({} crédit(s) utilisé(s))", telephone, json.path("totalCreditsRemoved").asInt());
            }
        } catch (Exception e) {
            log.error("Erreur envoi SMS OVH vers {}", telephone, e);
        }
    }

    private static String signer(String appSecret, String consumerKey, String method, String url, String body, long timestamp) {
        String toSign = appSecret + "+" + consumerKey + "+" + method + "+" + url + "+" + body + "+" + timestamp;
        return "$1$" + sha1Hex(toSign);
    }

    private static String sha1Hex(String input) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-1");
            byte[] hash = digest.digest(input.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder();
            for (byte b : hash) {
                sb.append(String.format("%02x", b));
            }
            return sb.toString();
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-1 indisponible", e);
        }
    }
}
