package com.plateformeopportunites.identity.controller;

import com.plateformeopportunites.identity.dto.AuthResponse;
import com.plateformeopportunites.identity.dto.ConnexionRequest;
import com.plateformeopportunites.identity.dto.CreerAdminRequest;
import com.plateformeopportunites.identity.service.AuthService;
import com.plateformeopportunites.security.JwtService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.ExampleObject;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/admin/auth")
@RequiredArgsConstructor
@Tag(name = "Authentification Admin", description = "Connexion des administrateurs")
@SecurityRequirement(name = "")
public class AdminAuthController {

    private final AuthService authService;
    private final JwtService jwtService;

    @Operation(
        summary = "Déconnexion admin — révoque le token JWT côté serveur"
    )
    @PostMapping("/logout")
    public ResponseEntity<Void> logout(@RequestHeader("Authorization") String authHeader) {
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            jwtService.blacklisterToken(authHeader.substring(7));
        }
        return ResponseEntity.ok().build();
    }

    @Operation(
        summary = "Connexion administrateur",
        requestBody = @io.swagger.v3.oas.annotations.parameters.RequestBody(
            content = @Content(examples = @ExampleObject(value = """
                {
                  "identifiant": "admin@plateforme.tg",
                  "motDePasse": "Admin@1234"
                }
                """))
        )
    )
    @PostMapping("/connexion")
    public ResponseEntity<AuthResponse> connecter(@Valid @RequestBody ConnexionRequest req) {
        return ResponseEntity.ok(authService.connecterAdmin(req));
    }

    @Operation(summary = "Créer un administrateur — réservé SUPER_ADMIN")
    @PostMapping("/admins")
    public ResponseEntity<Void> creerAdmin(Authentication auth,
                                           @Valid @RequestBody CreerAdminRequest req) {
        authService.creerAdmin(UUID.fromString(auth.getName()), req);
        return ResponseEntity.status(HttpStatus.CREATED).build();
    }
}
