package com.plateformeopportunites.security;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.http.HttpMethod;
import org.springframework.security.web.util.matcher.AntPathRequestMatcher;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthFilter jwtAuthFilter;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        return http
                .csrf(AbstractHttpConfigurer::disable)
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        // Routes protégées qui correspondent sinon aux patterns publics ci-dessous
                        .requestMatchers(
                                new AntPathRequestMatcher("/api/opportunites/mes-participations", HttpMethod.GET.name()),
                                new AntPathRequestMatcher("/api/sondages/mes-participations", HttpMethod.GET.name())
                        ).hasRole("PARTICIPANT")
                        .requestMatchers(
                                AntPathRequestMatcher.antMatcher("/api/auth/verifier-token"),
                                AntPathRequestMatcher.antMatcher("/api/admin/auth/**"),
                                AntPathRequestMatcher.antMatcher("/api/auth/dev/**"),
                                AntPathRequestMatcher.antMatcher("/api/opportunites"),
                                AntPathRequestMatcher.antMatcher("/api/opportunites/**"),
                                AntPathRequestMatcher.antMatcher("/api/stats"),
                                AntPathRequestMatcher.antMatcher("/api/bannieres"),
                                AntPathRequestMatcher.antMatcher("/api/events/opportunite/**"),
                                AntPathRequestMatcher.antMatcher("/api/events/sondage/**"),
                                AntPathRequestMatcher.antMatcher("/api/events/opportunites"),
                                AntPathRequestMatcher.antMatcher("/api/events/sondages"),
                                AntPathRequestMatcher.antMatcher("/uploads/**"),
                                AntPathRequestMatcher.antMatcher("/swagger-ui/**"),
                                AntPathRequestMatcher.antMatcher("/swagger-ui.html"),
                                AntPathRequestMatcher.antMatcher("/v3/api-docs/**"),
                                AntPathRequestMatcher.antMatcher("/api/paiements/webhook/paygate"),
                                AntPathRequestMatcher.antMatcher("/api/wallet/recharger/paygate/mode")
                        ).permitAll()
                        .requestMatchers(
                                new AntPathRequestMatcher("/api/sondages", HttpMethod.GET.name()),
                                new AntPathRequestMatcher("/api/sondages/*", HttpMethod.GET.name()),
                                // Questions d'éligibilité publiques — /mon-eligibilite reste protégé (PARTICIPANT)
                                new AntPathRequestMatcher("/api/sondages/*/eligibilite", HttpMethod.GET.name())
                        ).permitAll()
                        .requestMatchers(AntPathRequestMatcher.antMatcher("/api/admin/**")).hasRole("ADMIN")
                        .anyRequest().hasRole("PARTICIPANT")
                )
                .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class)
                .build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOriginPatterns(List.of("*"));
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        config.setAllowCredentials(true);
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }
}
