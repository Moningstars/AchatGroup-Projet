package com.plateformeopportunites.security;

import com.plateformeopportunites.common.enums.StatutCompte;
import com.plateformeopportunites.identity.repository.AdministrateurRepository;
import com.plateformeopportunites.identity.repository.UtilisateurRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Slf4j
@Component
@RequiredArgsConstructor
public class JwtAuthFilter extends OncePerRequestFilter {

    private final JwtService jwtService;
    private final UtilisateurRepository utilisateurRepository;
    private final AdministrateurRepository administrateurRepository;

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        String authHeader = request.getHeader("Authorization");
        String token;

        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            token = authHeader.substring(7);
        } else {
            // SSE connections cannot set headers — accept token as query param
            String tokenParam = request.getParameter("token");
            if (tokenParam == null || tokenParam.isBlank()) {
                filterChain.doFilter(request, response);
                return;
            }
            token = tokenParam;
        }

        try {
            // Vérification blacklist — Redis peut être indisponible, on ne bloque pas l'auth dans ce cas
            try {
                if (jwtService.estBlackliste(token)) {
                    filterChain.doFilter(request, response);
                    return;
                }
            } catch (Exception redisEx) {
                log.warn("Redis indisponible, vérification blacklist ignorée : {}", redisEx.getMessage());
            }

            String role = tryExtractRole(token);
            if (role == null) {
                filterChain.doFilter(request, response);
                return;
            }

            if ("PARTICIPANT".equals(role) && jwtService.validateParticipantToken(token)) {
                UUID id = jwtService.extractParticipantId(token);
                utilisateurRepository.findById(id)
                        .filter(u -> u.getStatut() != StatutCompte.SUSPENDU)
                        .ifPresent(u -> setAuthentication(request, id.toString(), "ROLE_PARTICIPANT"));
            } else if ("ADMIN".equals(role) && jwtService.validateAdminToken(token)) {
                UUID id = jwtService.extractAdminId(token);
                String niveauAcces = jwtService.extractNiveauAcces(token);
                administrateurRepository.findById(id).ifPresent(a -> {
                    List<SimpleGrantedAuthority> authorities = new ArrayList<>();
                    authorities.add(new SimpleGrantedAuthority("ROLE_ADMIN"));
                    if (niveauAcces != null) {
                        authorities.add(new SimpleGrantedAuthority(niveauAcces)); // SUPER_ADMIN ou MODERATEUR
                    }
                    setAuthentication(request, id.toString(), authorities);
                });
            }
        } catch (Exception ignored) {
        }

        filterChain.doFilter(request, response);
    }

    private String tryExtractRole(String token) {
        try {
            return jwtService.extractRole(token, jwtService.getSecretParticipant());
        } catch (Exception e) {
            try {
                return jwtService.extractRole(token, jwtService.getSecretAdmin());
            } catch (Exception ex) {
                return null;
            }
        }
    }

    private void setAuthentication(HttpServletRequest request, String principal, String role) {
        setAuthentication(request, principal, List.of(new SimpleGrantedAuthority(role)));
    }

    private void setAuthentication(HttpServletRequest request, String principal,
                                   List<SimpleGrantedAuthority> authorities) {
        UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(
                principal, null, authorities);
        auth.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
        SecurityContextHolder.getContext().setAuthentication(auth);
    }
}
