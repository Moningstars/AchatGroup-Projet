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
@Tag(name = "Authentification", description = "Connexion et inscription par OTP via numéro de téléphone")
public class AuthController {

    private final AuthService authService;
    private final JwtService jwtService;

    // ── Étape 1 : envoi OTP ──────────────────────────────────────────────────────

    @Operation(
        summary = "Initier l'authentification",
        description = "Envoie un OTP au numéro fourni. Retourne mode=CONNEXION si le numéro existe déjà, mode=INSCRIPTION sinon.",
        requestBody = @io.swagger.v3.oas.annotations.parameters.RequestBody(
            content = @Content(examples = @ExampleObject(value = """
                { "indicatif": "+228", "telephone": "90123456" }
                """))
        )
    )
    @SecurityRequirement(name = "")
    @PostMapping("/initier")
    public ResponseEntity<InitierAuthResponse> initierAuth(@Valid @RequestBody InitierAuthRequest req) {
        return ResponseEntity.ok(authService.initierAuth(req));
    }

    // ── Étape 2 : vérification OTP ───────────────────────────────────────────────

    @Operation(
        summary = "Vérifier l'OTP",
        description = "Valide le code OTP. Si le numéro n'existait pas → crée le compte. Retourne toujours un JWT.",
        requestBody = @io.swagger.v3.oas.annotations.parameters.RequestBody(
            content = @Content(examples = @ExampleObject(value = """
                { "telephone": "+22890123456", "code": "123456" }
                """))
        )
    )
    @SecurityRequirement(name = "")
    @PostMapping("/verifier")
    public ResponseEntity<AuthResponse> verifierAuth(@Valid @RequestBody VerifierAuthRequest req) {
        return ResponseEntity.ok(authService.verifierAuth(req));
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
