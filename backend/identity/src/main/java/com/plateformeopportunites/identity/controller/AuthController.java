package com.plateformeopportunites.identity.controller;

import com.plateformeopportunites.identity.dto.*;
import com.plateformeopportunites.identity.service.AuthService;
import com.plateformeopportunites.security.JwtService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.ExampleObject;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@Tag(name = "Authentification", description = "Connexion et inscription par numéro de téléphone (Firebase Phone Auth)")
public class AuthController {

    private final AuthService authService;
    private final JwtService jwtService;

    // ── Vérification du token Firebase (Phone Auth) ──────────────────────────────

    @Operation(
        summary = "Vérifier un token Firebase (Phone Auth)",
        description = "L'envoi et la saisie du code OTP se font côté client via le SDK Firebase. " +
                "Cet endpoint vérifie l'ID token résultant et retourne un JWT applicatif. " +
                "Si le numéro n'existait pas → crée le compte.",
        requestBody = @io.swagger.v3.oas.annotations.parameters.RequestBody(
            content = @Content(examples = @ExampleObject(value = """
                { "idToken": "eyJhbGciOi..." }
                """))
        )
    )
    @SecurityRequirement(name = "")
    @PostMapping("/verifier-token")
    public ResponseEntity<AuthResponse> verifierFirebaseToken(@Valid @RequestBody VerifierFirebaseTokenRequest req) {
        return ResponseEntity.ok(authService.verifierFirebaseToken(req));
    }

    // ── Connexion locale / démonstration ────────────────────────────────────────

    @Operation(
        summary = "[DEV] Connexion par téléphone sans vérification Firebase",
        description = "Endpoint désactivé par défaut. À activer explicitement via app.auth.dev-login-enabled=true uniquement en local ou démonstration."
    )
    @SecurityRequirement(name = "")
    @PostMapping("/dev/connexion")
    public ResponseEntity<AuthResponse> connecterDev(@Valid @RequestBody ConnexionDevRequest req) {
        return ResponseEntity.ok(authService.connecterDev(req.getTelephone()));
    }

    // ── Déconnexion ──────────────────────────────────────────────────────────────

    @Operation(summary = "Déconnexion — révoque le token JWT côté serveur")
    @PostMapping("/logout")
    public ResponseEntity<Void> logout(@RequestHeader("Authorization") String authHeader) {
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            jwtService.blacklisterToken(authHeader.substring(7));
        }
        return ResponseEntity.ok().build();
    }

    // ── Profil (authentifié) ─────────────────────────────────────────────────────

    @Operation(summary = "Compléter le profil (nom)", description = "Passe profilComplete=true et statut=ACTIF.")
    @PostMapping("/completer-profil")
    public ResponseEntity<AuthResponse> completerProfil(Authentication auth,
                                                         @Valid @RequestBody CompleterProfilRequest req) {
        return ResponseEntity.ok(authService.completerProfil(UUID.fromString(auth.getName()), req));
    }

    @Operation(summary = "Définir ou changer son mot de passe")
    @PostMapping("/definir-motdepasse")
    public ResponseEntity<Void> definirMotDePasse(Authentication auth,
                                                   @Valid @RequestBody DefinirMotDePasseRequest req) {
        authService.definirMotDePasse(UUID.fromString(auth.getName()), req);
        return ResponseEntity.ok().build();
    }
}
