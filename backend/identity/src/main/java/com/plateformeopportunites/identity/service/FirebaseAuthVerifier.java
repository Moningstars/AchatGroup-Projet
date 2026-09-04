package com.plateformeopportunites.identity.service;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseAuthException;
import com.google.firebase.auth.FirebaseToken;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.FileInputStream;
import java.io.IOException;

/**
 * Vérifie les ID tokens Firebase (Phone Auth) et en extrait le numéro de téléphone.
 * L'envoi/la saisie du code se fait entièrement côté client via le SDK Firebase JS —
 * ce service n'intervient qu'après, pour valider le token que le client obtient.
 */
@Slf4j
@Service
public class FirebaseAuthVerifier {

    @Value("${firebase.credentials-path:./firebase-service-account.json}")
    private String credentialsPath;

    @Value("${firebase.dev-mode:true}")
    private boolean devMode;

    private volatile FirebaseApp firebaseApp;

    public String verifierEtExtraireTelephone(String idToken) {
        if (devMode) {
            throw new IllegalStateException(
                    "Firebase non configuré (firebase.dev-mode actif) — impossible de vérifier le token");
        }

        FirebaseToken decoded;
        try {
            decoded = FirebaseAuth.getInstance(getFirebaseApp()).verifyIdToken(idToken);
        } catch (FirebaseAuthException e) {
            log.warn("Échec vérification token Firebase : {}", e.getMessage());
            throw new IllegalArgumentException("Token Firebase invalide ou expiré");
        }

        Object telephone = decoded.getClaims().get("phone_number");
        if (telephone == null) {
            throw new IllegalArgumentException("Le token Firebase ne contient pas de numéro de téléphone vérifié");
        }
        return telephone.toString();
    }

    private FirebaseApp getFirebaseApp() {
        if (firebaseApp == null) {
            synchronized (this) {
                if (firebaseApp == null) {
                    try (FileInputStream serviceAccount = new FileInputStream(credentialsPath)) {
                        FirebaseOptions options = FirebaseOptions.builder()
                                .setCredentials(GoogleCredentials.fromStream(serviceAccount))
                                .build();
                        firebaseApp = FirebaseApp.getApps().isEmpty()
                                ? FirebaseApp.initializeApp(options)
                                : FirebaseApp.getInstance();
                    } catch (IOException e) {
                        throw new IllegalStateException(
                                "Impossible de charger les identifiants Firebase (chemin: " + credentialsPath + ")", e);
                    }
                }
            }
        }
        return firebaseApp;
    }
}
