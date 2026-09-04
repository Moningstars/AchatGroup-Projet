package com.plateformeopportunites.finance.service;

import com.plateformeopportunites.common.enums.NiveauVerification;
import com.plateformeopportunites.common.enums.StatutTransaction;
import com.plateformeopportunites.common.enums.TypeTransaction;
import com.plateformeopportunites.common.event.RetraitDemandeEvent;
import com.plateformeopportunites.common.service.PusherNotificationService;
import com.plateformeopportunites.finance.dto.RechargeRequest;
import com.plateformeopportunites.finance.dto.RetraitRequest;
import com.plateformeopportunites.finance.entity.Portefeuille;
import com.plateformeopportunites.finance.repository.PortefeuilleRepository;
import com.plateformeopportunites.finance.repository.TransactionRepository;
import com.plateformeopportunites.finance.repository.WalletPlateformeRepository;
import com.plateformeopportunites.identity.entity.Utilisateur;
import com.plateformeopportunites.identity.repository.UtilisateurRepository;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;

@ExtendWith(MockitoExtension.class)
class WalletServiceTest {

    @Mock private PortefeuilleRepository portefeuilleRepository;
    @Mock private TransactionRepository transactionRepository;
    @Mock private WalletPlateformeRepository walletPlateformeRepository;
    @Mock private ApplicationEventPublisher eventPublisher;
    @Mock private UtilisateurRepository utilisateurRepository;
    @Mock private PusherNotificationService pusherNotificationService;
    @InjectMocks private WalletService walletService;

    private static final UUID PID = UUID.randomUUID();

    private Portefeuille wallet(String disponible) {
        return Portefeuille.builder()
                .id(UUID.randomUUID())
                .soldeDisponible(new BigDecimal(disponible))
                .soldeGele(BigDecimal.ZERO)
                .soldePoints(BigDecimal.ZERO)
                .devise("XOF")
                .build();
    }

    private Utilisateur utilisateurVerifie() {
        return Utilisateur.builder().id(PID).niveauVerification(NiveauVerification.VERIFIE).build();
    }

    // ── recharger ────────────────────────────────────────────────────────────

    @Test
    void recharger_augmenteSoldeDisponible() {
        Portefeuille p = wallet("5000");
        when(portefeuilleRepository.findByUtilisateurId(PID)).thenReturn(Optional.of(p));
        when(portefeuilleRepository.save(any())).thenReturn(p);
        when(walletPlateformeRepository.findAll()).thenReturn(List.of());

        RechargeRequest req = new RechargeRequest();
        req.setMontant(new BigDecimal("2000"));
        req.setMoyenPaiement("MOOV");
        req.setReference("REF001");

        walletService.recharger(PID, req);

        assertEquals(new BigDecimal("7000"), p.getSoldeDisponible());
        verify(transactionRepository).save(argThat(tx ->
                tx.getType() == TypeTransaction.DEPOT &&
                tx.getStatut() == StatutTransaction.SUCCESS));
    }

    // ── demanderRetrait ──────────────────────────────────────────────────────

    @Test
    void demanderRetrait_soldeInsuffisant_leveException() {
        Portefeuille p = wallet("500");
        when(utilisateurRepository.findById(PID)).thenReturn(Optional.of(utilisateurVerifie()));
        when(portefeuilleRepository.findByUtilisateurIdForUpdate(PID)).thenReturn(Optional.of(p));

        RetraitRequest req = new RetraitRequest();
        req.setMontant(new BigDecimal("1000"));

        assertThrows(IllegalArgumentException.class, () -> walletService.demanderRetrait(PID, req));
        verify(portefeuilleRepository, never()).save(any());
        verify(eventPublisher, never()).publishEvent(any());
    }

    @Test
    void demanderRetrait_geleLeFondsEtPublieEvenement() {
        Portefeuille p = wallet("5000");
        when(utilisateurRepository.findById(PID)).thenReturn(Optional.of(utilisateurVerifie()));
        when(portefeuilleRepository.findByUtilisateurIdForUpdate(PID)).thenReturn(Optional.of(p));
        when(portefeuilleRepository.save(any())).thenReturn(p);

        RetraitRequest req = new RetraitRequest();
        req.setMontant(new BigDecimal("2000"));

        walletService.demanderRetrait(PID, req);

        assertEquals(new BigDecimal("3000"), p.getSoldeDisponible());
        assertEquals(new BigDecimal("2000"), p.getSoldeGele());
        verify(eventPublisher).publishEvent(any(RetraitDemandeEvent.class));
        verify(transactionRepository).save(argThat(tx ->
                tx.getType() == TypeTransaction.RETRAIT &&
                tx.getStatut() == StatutTransaction.EN_COURS));
    }

    // ── gelerFonds ───────────────────────────────────────────────────────────

    @Test
    void gelerFonds_soldeInsuffisant_leveException() {
        Portefeuille p = wallet("100");
        when(portefeuilleRepository.findByUtilisateurId(PID)).thenReturn(Optional.of(p));

        assertThrows(IllegalArgumentException.class, () ->
                walletService.gelerFonds(PID, new BigDecimal("500"), null));
        verify(portefeuilleRepository, never()).save(any());
    }

    @Test
    void gelerFonds_transfereDisponibleVersGele() {
        Portefeuille p = wallet("5000");
        when(portefeuilleRepository.findByUtilisateurId(PID)).thenReturn(Optional.of(p));
        when(portefeuilleRepository.save(any())).thenReturn(p);

        walletService.gelerFonds(PID, new BigDecimal("2000"), null);

        assertEquals(new BigDecimal("3000"), p.getSoldeDisponible());
        assertEquals(new BigDecimal("2000"), p.getSoldeGele());
    }

    // ── rembourser ───────────────────────────────────────────────────────────

    @Test
    void rembourser_transfereGeleVersDisponible() {
        Portefeuille p = wallet("1000");
        p.setSoldeGele(new BigDecimal("500"));
        when(portefeuilleRepository.findByUtilisateurId(PID)).thenReturn(Optional.of(p));
        when(portefeuilleRepository.save(any())).thenReturn(p);

        walletService.rembourser(PID, new BigDecimal("500"));

        assertEquals(new BigDecimal("1500"), p.getSoldeDisponible());
        assertEquals(new BigDecimal("0"), p.getSoldeGele());
    }

    // ── crediterRecompense ───────────────────────────────────────────────────

    @Test
    void crediterRecompense_augmenteSoldeDisponible() {
        Portefeuille p = wallet("0");
        when(portefeuilleRepository.findByUtilisateurId(PID)).thenReturn(Optional.of(p));
        when(portefeuilleRepository.save(any())).thenReturn(p);

        walletService.crediterRecompense(PID, new BigDecimal("500"));

        assertEquals(new BigDecimal("500"), p.getSoldeDisponible());
    }

    // ── portefeuille introuvable ─────────────────────────────────────────────

    @Test
    void getSolde_portefeuilleIntrouvable_leveException() {
        when(portefeuilleRepository.findByUtilisateurId(PID)).thenReturn(Optional.empty());
        assertThrows(IllegalArgumentException.class, () -> walletService.getSolde(PID));
    }
}
