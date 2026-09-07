package com.plateformeopportunites.identity.service;

import com.plateformeopportunites.common.enums.StatutCommanditaire;
import com.plateformeopportunites.identity.entity.Commanditaire;
import com.plateformeopportunites.identity.entity.MouvementCommanditaire;
import com.plateformeopportunites.identity.repository.CommanditaireRepository;
import com.plateformeopportunites.identity.repository.MouvementCommanditaireRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowCallbackHandler;

import java.math.BigDecimal;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class CommanditaireServiceTest {
    private CommanditaireRepository repository;
    private MouvementCommanditaireRepository mouvementRepository;
    private JdbcTemplate jdbcTemplate;
    private CommanditaireService service;
    private Commanditaire commanditaire;

    @BeforeEach
    void setUp() {
        repository = mock(CommanditaireRepository.class);
        mouvementRepository = mock(MouvementCommanditaireRepository.class);
        jdbcTemplate = mock(JdbcTemplate.class);
        service = new CommanditaireService(repository, mouvementRepository, jdbcTemplate);
        commanditaire = Commanditaire.builder()
                .id(UUID.randomUUID()).nom("Sponsor").prenom("Test").societe("Demo")
                .email("sponsor@test.tg").telephone("+22890000000").statut(StatutCommanditaire.ACTIF)
                .soldeDisponible(new BigDecimal("10000")).soldeReserve(BigDecimal.ZERO)
                .totalAlimente(new BigDecimal("10000")).totalDistribue(BigDecimal.ZERO).build();
        when(repository.findWithLockById(commanditaire.getId())).thenReturn(Optional.of(commanditaire));
        when(repository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
    }

    @Test
    void reserveDistribuePuisLibereChezLeCommanditaire() {
        UUID sondageId = UUID.randomUUID();

        service.reserverBudget(commanditaire.getId(), sondageId, new BigDecimal("6000"));
        assertThat(commanditaire.getSoldeDisponible()).isEqualByComparingTo("4000");
        assertThat(commanditaire.getSoldeReserve()).isEqualByComparingTo("6000");

        service.distribuer(commanditaire.getId(), sondageId, new BigDecimal("1500"));
        assertThat(commanditaire.getSoldeReserve()).isEqualByComparingTo("4500");
        assertThat(commanditaire.getTotalDistribue()).isEqualByComparingTo("1500");

        service.liberer(commanditaire.getId(), sondageId, new BigDecimal("4500"));
        assertThat(commanditaire.getSoldeDisponible()).isEqualByComparingTo("8500");
        assertThat(commanditaire.getSoldeReserve()).isZero();

        ArgumentCaptor<MouvementCommanditaire> captor = ArgumentCaptor.forClass(MouvementCommanditaire.class);
        verify(mouvementRepository, times(3)).save(captor.capture());
        assertThat(captor.getAllValues()).extracting(MouvementCommanditaire::getType)
                .containsExactly(MouvementCommanditaire.Type.RESERVATION,
                        MouvementCommanditaire.Type.DISTRIBUTION,
                        MouvementCommanditaire.Type.LIBERATION);
    }

    @Test
    void refuseUneReservationSansSoldeSuffisant() {
        assertThatThrownBy(() -> service.reserverBudget(commanditaire.getId(), UUID.randomUUID(), new BigDecimal("10001")))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("Budget insuffisant");
        verifyNoInteractions(mouvementRepository);
    }

    @Test
    void refuseUnCommanditaireNonActif() {
        commanditaire.setStatut(StatutCommanditaire.SUSPENDU);
        assertThatThrownBy(() -> service.reserverBudget(commanditaire.getId(), UUID.randomUUID(), BigDecimal.ONE))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("n'est pas actif");
    }

    @Test
    void chargeLesStatistiquesDeLaListeEnUneSeuleRequete() {
        when(repository.findAll()).thenReturn(java.util.List.of(commanditaire));

        var resultats = service.lister();

        assertThat(resultats).hasSize(1);
        verify(jdbcTemplate, times(1)).query(anyString(), any(RowCallbackHandler.class));
        verify(jdbcTemplate, never()).queryForObject(anyString(), eq(Long.class), any());
    }
}
