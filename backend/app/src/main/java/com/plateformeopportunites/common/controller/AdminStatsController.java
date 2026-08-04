package com.plateformeopportunites.common.controller;

import com.plateformeopportunites.common.dto.AdminStatsResponse;
import com.plateformeopportunites.common.dto.AdminStatsResponse.PointMensuel;
import com.plateformeopportunites.common.enums.StatutCompte;
import com.plateformeopportunites.common.enums.StatutOpportunite;
import com.plateformeopportunites.common.enums.StatutSondage;
import com.plateformeopportunites.common.enums.StatutTransaction;
import com.plateformeopportunites.common.enums.TypeTransaction;
import com.plateformeopportunites.finance.entity.WalletPlateforme;
import com.plateformeopportunites.finance.repository.TransactionRepository;
import com.plateformeopportunites.finance.repository.WalletPlateformeRepository;
import com.plateformeopportunites.identity.entity.Utilisateur;
import com.plateformeopportunites.identity.repository.UtilisateurRepository;
import com.plateformeopportunites.opportunite.entity.Opportunite;
import com.plateformeopportunites.opportunite.repository.OpportuniteRepository;
import com.plateformeopportunites.sondage.repository.SondageRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.format.TextStyle;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/admin/stats")
@RequiredArgsConstructor
public class AdminStatsController {

    private final OpportuniteRepository    opportuniteRepository;
    private final SondageRepository        sondageRepository;
    private final UtilisateurRepository    utilisateurRepository;
    private final WalletPlateformeRepository walletPlateformeRepository;
    private final TransactionRepository    transactionRepository;

    @GetMapping
    public ResponseEntity<AdminStatsResponse> getStats() {

        // ── Opportunités ──────────────────────────────────────────────────────
        List<Opportunite> opps = opportuniteRepository.findAll();
        long actives   = opps.stream().filter(o -> o.getStatut() == StatutOpportunite.ACTIVE).count();
        long cloturees = opps.stream().filter(o -> o.getStatut() == StatutOpportunite.CLOTUREE).count();

        int tauxMoyen = opps.isEmpty() ? 0 : (int) Math.round(
                opps.stream()
                    .filter(o -> o.getSeuilMinimum() > 0)
                    .mapToDouble(o -> (double) o.getParticipantsActuels() / o.getSeuilMinimum() * 100)
                    .average()
                    .orElse(0)
        );

        // ── Sondages ──────────────────────────────────────────────────────────
        long totalSondages  = sondageRepository.count();
        long sondagesActifs = sondageRepository.countByStatut(StatutSondage.ACTIF);

        // ── Utilisateurs ──────────────────────────────────────────────────────
        List<Utilisateur> users = utilisateurRepository.findAll();
        long totalUsers  = users.size();
        long usersActifs = users.stream().filter(u -> u.getStatut() == StatutCompte.ACTIF).count();

        // ── Finance ───────────────────────────────────────────────────────────
        BigDecimal soldePlateforme = walletPlateformeRepository.findAll()
                .stream().findFirst()
                .map(WalletPlateforme::getSoldePlateforme)
                .orElse(BigDecimal.ZERO);

        long retraitsEnAttente = transactionRepository
                .findByTypeAndStatutOrderByCreatedAtDesc(TypeTransaction.RETRAIT, StatutTransaction.EN_COURS)
                .size();

        // ── Inscriptions mensuelles (6 derniers mois) ─────────────────────────
        LocalDateTime sixMoisAvant = LocalDateTime.now().minusMonths(5).withDayOfMonth(1)
                .withHour(0).withMinute(0).withSecond(0).withNano(0);

        Map<String, Long> parMois = users.stream()
                .filter(u -> u.getCreatedAt() != null && u.getCreatedAt().isAfter(sixMoisAvant))
                .collect(Collectors.groupingBy(
                        u -> u.getCreatedAt().getMonth().getDisplayName(TextStyle.SHORT, Locale.FRENCH)
                             + " " + u.getCreatedAt().getYear(),
                        Collectors.counting()
                ));

        List<PointMensuel> mensuel = new ArrayList<>();
        for (int i = 5; i >= 0; i--) {
            LocalDateTime moisRef = LocalDateTime.now().minusMonths(i);
            String cle = moisRef.getMonth().getDisplayName(TextStyle.SHORT, Locale.FRENCH)
                         + " " + moisRef.getYear();
            String label = moisRef.getMonth().getDisplayName(TextStyle.SHORT, Locale.FRENCH);
            mensuel.add(PointMensuel.builder()
                    .mois(capitalize(label))
                    .inscrits(parMois.getOrDefault(cle, 0L))
                    .build());
        }

        return ResponseEntity.ok(AdminStatsResponse.builder()
                .totalOpportunites(opps.size())
                .opportunitesActives(actives)
                .opportunitesCloturees(cloturees)
                .tauxRemplissageMoyen(tauxMoyen)
                .totalSondages(totalSondages)
                .sondagesActifs(sondagesActifs)
                .totalUtilisateurs(totalUsers)
                .utilisateursActifs(usersActifs)
                .soldePlateforme(soldePlateforme)
                .retraitsEnAttente(retraitsEnAttente)
                .inscriptionsMensuelles(mensuel)
                .build());
    }

    private String capitalize(String s) {
        if (s == null || s.isEmpty()) return s;
        return Character.toUpperCase(s.charAt(0)) + s.substring(1);
    }
}
