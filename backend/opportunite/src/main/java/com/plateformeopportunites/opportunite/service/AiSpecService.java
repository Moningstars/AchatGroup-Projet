package com.plateformeopportunites.opportunite.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.plateformeopportunites.opportunite.dto.GenererSpecsRequest;
import com.plateformeopportunites.opportunite.dto.GenererSpecsResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class AiSpecService {

    private final ObjectMapper objectMapper;

    @Value("${anthropic.api-key}")
    private String apiKey;

    @Value("${anthropic.api-url}")
    private String apiUrl;

    @Value("${anthropic.dev-mode:true}")
    private boolean devMode;

    @Value("${gemini.api-key:}")
    private String geminiApiKey;

    @Value("${gemini.api-url}")
    private String geminiApiUrl;

    private static final String SYSTEM_PROMPT = "Tu aides un administrateur à rédiger une opportunité pour OpportuniHub, un site togolais d'achats groupés. "
            + "À partir du titre, du brouillon de description et de la catégorie fournis, génère une description claire de 60 à 100 mots, "
            + "suggère exactement une catégorie parmi Mode, Électronique, Véhicules, Maison, Alimentaire, Informatique, Beauté, Mobilier et Sport, "
            + "rédige un court message de partage contenant les variables {titre} et {prix}, puis génère des points forts courts et concrets, "
            + "un paragraphe de cas d'usage et des conditions particulières utiles. "
            + "Si un brouillon est fourni, améliore-le sans perdre ses informations. "
            + "N'invente aucune caractéristique technique précise (dimensions, quantités, garanties) qui ne serait pas "
            + "déjà présente dans la description fournie.";

    private static final Map<String, Object> ANTHROPIC_SCHEMA = Map.of(
            "type", "object",
            "properties", Map.of(
                    "description", Map.of(
                            "type", "string",
                            "description", "Description commerciale claire de 60 à 100 mots, sans information technique inventée"
                    ),
                    "categorieSuggestion", Map.of(
                            "type", "string",
                            "enum", List.of("Mode", "Électronique", "Véhicules", "Maison", "Alimentaire", "Informatique", "Beauté", "Mobilier", "Sport")
                    ),
                    "messagePartage", Map.of(
                            "type", "string",
                            "description", "Message court pour partager l'opportunité, contenant littéralement {titre} et {prix}"
                    ),
                    "pointsForts", Map.of(
                            "type", "array",
                            "items", Map.of("type", "string"),
                            "description", "3 à 5 points forts courts et concrets de cette opportunité"
                    ),
                    "casUsage", Map.of(
                            "type", "string",
                            "description", "Un paragraphe décrivant pour qui et pour quel usage ce produit/service est adapté"
                    ),
                    "finePrint", Map.of(
                            "type", "string",
                            "description", "Conditions particulières ou précisions utiles à connaître avant achat"
                    )
            ),
            "required", List.of("description", "categorieSuggestion", "messagePartage", "pointsForts", "casUsage", "finePrint"),
            "additionalProperties", false
    );

    private static final Map<String, Object> GEMINI_SCHEMA = Map.of(
            "type", "OBJECT",
            "properties", Map.of(
                    "description", Map.of(
                            "type", "STRING",
                            "description", "Description commerciale claire de 60 à 100 mots, sans information technique inventée"
                    ),
                    "categorieSuggestion", Map.of(
                            "type", "STRING",
                            "enum", List.of("Mode", "Électronique", "Véhicules", "Maison", "Alimentaire", "Informatique", "Beauté", "Mobilier", "Sport")
                    ),
                    "messagePartage", Map.of(
                            "type", "STRING",
                            "description", "Message court pour partager l'opportunité, contenant littéralement {titre} et {prix}"
                    ),
                    "pointsForts", Map.of(
                            "type", "ARRAY",
                            "items", Map.of("type", "STRING"),
                            "description", "3 à 5 points forts courts et concrets de cette opportunité"
                    ),
                    "casUsage", Map.of(
                            "type", "STRING",
                            "description", "Un paragraphe décrivant pour qui et pour quel usage ce produit/service est adapté"
                    ),
                    "finePrint", Map.of(
                            "type", "STRING",
                            "description", "Conditions particulières ou précisions utiles à connaître avant achat"
                    )
            ),
            "required", List.of("description", "categorieSuggestion", "messagePartage", "pointsForts", "casUsage", "finePrint")
    );

    public GenererSpecsResponse genererSpecs(GenererSpecsRequest req) {
        if (devMode) {
            if (!geminiEstConfigure()) {
                log.info("Gemini n'est pas configuré : utilisation de l'assistant de rédaction local");
                return genererLocalement(req);
            }
            try {
                return genererAvecGemini(req);
            } catch (RuntimeException exception) {
                log.warn("Gemini est indisponible : bascule vers l'assistant de rédaction local");
                return genererLocalement(req);
            }
        }
        return genererAvecAnthropic(req);
    }

    private boolean geminiEstConfigure() {
        if (geminiApiKey == null || geminiApiKey.isBlank()) return false;
        String valeur = geminiApiKey.trim().toLowerCase(Locale.ROOT);
        return !valeur.startsWith("dev-") && !valeur.contains("disabled") && !valeur.contains("placeholder");
    }

    private GenererSpecsResponse genererLocalement(GenererSpecsRequest req) {
        String titre = req.getTitre().trim();
        String brouillon = req.getDescription() == null ? "" : req.getDescription().trim();
        String categorie = req.getCategorie();
        if (categorie == null || categorie.isBlank()) {
            categorie = suggererCategorie(titre + " " + brouillon);
        }

        String description = brouillon.isBlank()
                ? "Découvrez " + titre + ", une opportunité pensée pour faciliter un achat groupé avantageux. "
                    + "Cette offre permet aux participants de se regrouper afin d’accéder à un tarif évolutif selon le nombre de souscriptions. "
                    + "Consultez les paliers, les conditions et les visuels avant de participer."
                : brouillon + (brouillon.endsWith(".") ? "" : ".")
                    + " Profitez du principe d’achat groupé pour accéder au meilleur tarif atteint par l’ensemble des participants.";

        return new GenererSpecsResponse(
                description,
                categorie,
                "🔥 Découvrez « {titre} » sur OpportuniHub à partir de {prix} FCFA. Rejoignez l’achat groupé avant sa clôture !",
                List.of(
                        "Tarif évolutif selon le nombre de participants",
                        "Conditions et paliers consultables avant la souscription",
                        "Suivi de l’opportunité depuis votre espace participant"
                ),
                "Cette opportunité s’adresse aux personnes souhaitant mutualiser leur achat et bénéficier du tarif correspondant au palier atteint.",
                "Vérifiez la description, les paliers de prix, la date de clôture et les modalités du fournisseur avant de souscrire."
        );
    }

    private String suggererCategorie(String contenu) {
        String texte = contenu.toLowerCase(Locale.ROOT);
        if (contientUn(texte, "ordinateur", "téléphone", "informatique", "logiciel", "imprimante")) return "Informatique";
        if (contientUn(texte, "électronique", "télévision", "audio", "casque", "caméra")) return "Électronique";
        if (contientUn(texte, "voiture", "moto", "vélo", "véhicule", "pneu")) return "Véhicules";
        if (contientUn(texte, "sport", "ballon", "maillot", "fitness", "gym")) return "Sport";
        if (contientUn(texte, "robe", "chemise", "chaussure", "vêtement", "mode")) return "Mode";
        if (contientUn(texte, "crème", "parfum", "beauté", "cosmétique", "maquillage")) return "Beauté";
        if (contientUn(texte, "aliment", "riz", "huile", "boisson", "repas")) return "Alimentaire";
        if (contientUn(texte, "table", "chaise", "armoire", "meuble", "bureau")) return "Mobilier";
        return "Maison";
    }

    private boolean contientUn(String texte, String... mots) {
        for (String mot : mots) {
            if (texte.contains(mot)) return true;
        }
        return false;
    }

    private String buildUserContent(GenererSpecsRequest req) {
        return "Titre: " + req.getTitre()
                + "\nCatégorie: " + (req.getCategorie() != null ? req.getCategorie() : "non précisée")
                + "\nDescription: " + (req.getDescription() != null ? req.getDescription() : "aucune");
    }

    // ── MODE DEV : appel réel mais gratuit à l'API Gemini ──
    private GenererSpecsResponse genererAvecGemini(GenererSpecsRequest req) {
        Map<String, Object> body = Map.of(
                "system_instruction", Map.of("parts", List.of(Map.of("text", SYSTEM_PROMPT))),
                "contents", List.of(Map.of("parts", List.of(Map.of("text", buildUserContent(req))))),
                "generationConfig", Map.of(
                        "responseMimeType", "application/json",
                        "responseSchema", GEMINI_SCHEMA
                )
        );

        try {
            String jsonBody = objectMapper.writeValueAsString(body);
            HttpClient client = HttpClient.newHttpClient();
            HttpRequest httpRequest = HttpRequest.newBuilder()
                    .uri(URI.create(geminiApiUrl + "?key=" + geminiApiKey))
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(jsonBody))
                    .build();

            HttpResponse<String> response = client.send(httpRequest, HttpResponse.BodyHandlers.ofString());
            JsonNode json = objectMapper.readTree(response.body());

            if (response.statusCode() != 200) {
                String detail = json.path("error").path("message").asText(response.body());
                log.error("Erreur API Gemini (HTTP {}): {}", response.statusCode(), response.body());
                throw new IllegalStateException("Erreur API Gemini (" + response.statusCode() + ") : " + detail);
            }

            JsonNode candidates = json.path("candidates");
            if (!candidates.isArray() || candidates.isEmpty()) {
                log.error("Réponse Gemini inattendue: {}", response.body());
                throw new IllegalStateException("Impossible de générer les fiches produit (mode dev / Gemini). Réessayez.");
            }

            String textJson = candidates.get(0).path("content").path("parts").get(0).path("text").asText();
            JsonNode specs = objectMapper.readTree(textJson);

            List<String> pointsForts = new ArrayList<>();
            specs.path("pointsForts").forEach(n -> pointsForts.add(n.asText()));

            return new GenererSpecsResponse(
                    specs.path("description").asText(),
                    specs.path("categorieSuggestion").asText(),
                    specs.path("messagePartage").asText(),
                    pointsForts,
                    specs.path("casUsage").asText(),
                    specs.path("finePrint").asText()
            );

        } catch (IOException | InterruptedException e) {
            log.error("Erreur appel API Gemini", e);
            throw new IllegalStateException("Impossible de générer les fiches produit avec l'IA (mode dev). Réessayez.");
        }
    }

    // ── MODE PRODUCTION : appel réel et payant à l'API Anthropic ──
    private GenererSpecsResponse genererAvecAnthropic(GenererSpecsRequest req) {
        Map<String, Object> body = Map.of(
                "model", "claude-haiku-4-5",
                "max_tokens", 1024,
                "system", SYSTEM_PROMPT,
                "output_config", Map.of("format", Map.of("type", "json_schema", "schema", ANTHROPIC_SCHEMA)),
                "messages", List.of(Map.of("role", "user", "content", buildUserContent(req)))
        );

        try {
            String jsonBody = objectMapper.writeValueAsString(body);
            HttpClient client = HttpClient.newHttpClient();
            HttpRequest httpRequest = HttpRequest.newBuilder()
                    .uri(URI.create(apiUrl))
                    .header("Content-Type", "application/json")
                    .header("x-api-key", apiKey)
                    .header("anthropic-version", "2023-06-01")
                    .POST(HttpRequest.BodyPublishers.ofString(jsonBody))
                    .build();

            HttpResponse<String> response = client.send(httpRequest, HttpResponse.BodyHandlers.ofString());
            JsonNode json = objectMapper.readTree(response.body());

            if (response.statusCode() != 200) {
                String detail = json.path("error").path("message").asText(response.body());
                log.error("Erreur API Anthropic (HTTP {}): {}", response.statusCode(), response.body());
                throw new IllegalStateException("Erreur API Anthropic (" + response.statusCode() + ") : " + detail);
            }

            JsonNode contentNode = json.path("content");
            if (!contentNode.isArray() || contentNode.isEmpty()) {
                log.error("Réponse Anthropic inattendue: {}", response.body());
                throw new IllegalStateException("Réponse inattendue de l'IA. Réessayez.");
            }

            JsonNode specs = objectMapper.readTree(contentNode.get(0).path("text").asText());

            List<String> pointsForts = new ArrayList<>();
            specs.path("pointsForts").forEach(n -> pointsForts.add(n.asText()));

            return new GenererSpecsResponse(
                    specs.path("description").asText(),
                    specs.path("categorieSuggestion").asText(),
                    specs.path("messagePartage").asText(),
                    pointsForts,
                    specs.path("casUsage").asText(),
                    specs.path("finePrint").asText()
            );

        } catch (IOException | InterruptedException e) {
            log.error("Erreur appel API Anthropic", e);
            throw new IllegalStateException("Impossible de générer les fiches produit avec l'IA. Réessayez.");
        }
    }
}
