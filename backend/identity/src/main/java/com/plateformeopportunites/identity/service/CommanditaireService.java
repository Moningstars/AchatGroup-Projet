package com.plateformeopportunites.identity.service;

import com.plateformeopportunites.common.enums.StatutCommanditaire;
import com.plateformeopportunites.identity.dto.*;
import com.plateformeopportunites.identity.entity.Commanditaire;
import com.plateformeopportunites.identity.entity.MouvementCommanditaire;
import com.plateformeopportunites.identity.repository.CommanditaireRepository;
import com.plateformeopportunites.identity.repository.MouvementCommanditaireRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowCallbackHandler;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CommanditaireService {
    private final CommanditaireRepository repository;
    private final MouvementCommanditaireRepository mouvementRepository;
    private final JdbcTemplate jdbcTemplate;

    @Transactional(readOnly = true)
    public List<CommanditaireResponse> lister() {
        Map<UUID, long[]> statistiques = statistiquesSondages();
        return repository.findAll().stream()
                .map(commanditaire -> {
                    long[] valeurs = statistiques.getOrDefault(commanditaire.getId(), new long[2]);
                    return toResponse(commanditaire, valeurs[0], valeurs[1]);
                })
                .toList();
    }

    @Transactional(readOnly = true)
    public CommanditaireResponse consulter(UUID id) { return toResponse(get(id)); }

    @Transactional
    public CommanditaireResponse creer(CreerCommanditaireRequest req) {
        String email = email(req.getEmail());
        String telephone = telephone(req.getTelephone());
        verifierUnicite(email, telephone, null);
        Commanditaire c = Commanditaire.builder()
                .nom(req.getNom().trim()).prenom(req.getPrenom().trim()).societe(req.getSociete().trim())
                .email(email).telephone(telephone).build();
        return toResponse(repository.save(c));
    }

    @Transactional
    public CommanditaireResponse modifier(UUID id, ModifierCommanditaireRequest req) {
        Commanditaire c = getForUpdate(id);
        String email = email(req.getEmail());
        String telephone = telephone(req.getTelephone());
        verifierUnicite(email, telephone, id);
        c.setNom(req.getNom().trim());
        c.setPrenom(req.getPrenom().trim());
        c.setSociete(req.getSociete().trim());
        c.setEmail(email);
        c.setTelephone(telephone);
        return toResponse(repository.save(c));
    }

    @Transactional
    public CommanditaireResponse changerStatut(UUID id, StatutCommanditaire statut, String motif) {
        Commanditaire c = getForUpdate(id);
        if (c.getStatut() == statut) throw new IllegalStateException("Le commanditaire possède déjà ce statut");
        if (statut == StatutCommanditaire.SUSPENDU && sondagesActifs(id) > 0) {
            throw new IllegalStateException("Impossible de suspendre ce commanditaire : des sondages financés sont encore actifs ou en cours de distribution");
        }
        c.setStatut(statut);
        c.setMotifStatut(motif.trim());
        c.setStatutChangedAt(LocalDateTime.now());
        return toResponse(repository.save(c));
    }

    @Transactional
    public CommanditaireResponse alimenter(UUID id, AlimenterCommanditaireRequest req) {
        Commanditaire c = getForUpdate(id);
        BigDecimal montant = req.getMontant();
        normaliserSoldes(c);
        c.setSoldeDisponible(c.getSoldeDisponible().add(montant));
        c.setTotalAlimente(c.getTotalAlimente().add(montant));
        repository.save(c);
        enregistrer(c, MouvementCommanditaire.Type.ALIMENTATION, montant, null,
                req.getReference(), req.getDescription());
        return toResponse(c);
    }

    @Transactional(readOnly = true)
    public List<MouvementCommanditaireResponse> mouvements(UUID id) {
        get(id);
        return mouvementRepository.findTop50ByCommanditaireIdOrderByCreatedAtDesc(id).stream()
                .map(m -> MouvementCommanditaireResponse.builder().id(m.getId()).type(m.getType().name())
                        .montant(m.getMontant()).soldeApres(m.getSoldeApres()).sondageId(m.getSondageId())
                        .reference(m.getReference()).description(m.getDescription()).createdAt(m.getCreatedAt()).build())
                .toList();
    }

    @Transactional
    public void reserverBudget(UUID id, UUID sondageId, BigDecimal montant) {
        if (montant == null || montant.signum() <= 0) return;
        Commanditaire c = getForUpdate(id);
        normaliserSoldes(c);
        if (c.getStatut() != StatutCommanditaire.ACTIF) {
            throw new IllegalStateException("Le commanditaire sélectionné n'est pas actif");
        }
        if (c.getSoldeDisponible().compareTo(montant) < 0) {
            throw new IllegalStateException("Budget insuffisant chez le commanditaire (disponible : " + c.getSoldeDisponible() + " FCFA, requis : " + montant + " FCFA)");
        }
        c.setSoldeDisponible(c.getSoldeDisponible().subtract(montant));
        c.setSoldeReserve(c.getSoldeReserve().add(montant));
        repository.save(c);
        enregistrer(c, MouvementCommanditaire.Type.RESERVATION, montant, sondageId, "SONDAGE-" + sondageId, "Réservation du budget du sondage");
    }

    @Transactional
    public void distribuer(UUID id, UUID sondageId, BigDecimal montant) {
        if (montant == null || montant.signum() <= 0) return;
        Commanditaire c = getForUpdate(id);
        normaliserSoldes(c);
        if (c.getSoldeReserve().compareTo(montant) < 0) throw new IllegalStateException("Budget réservé du commanditaire insuffisant");
        c.setSoldeReserve(c.getSoldeReserve().subtract(montant));
        c.setTotalDistribue(c.getTotalDistribue().add(montant));
        repository.save(c);
        enregistrer(c, MouvementCommanditaire.Type.DISTRIBUTION, montant, sondageId, "SONDAGE-" + sondageId, "Récompense distribuée à un répondant");
    }

    @Transactional
    public void liberer(UUID id, UUID sondageId, BigDecimal montant) {
        if (montant == null || montant.signum() <= 0) return;
        Commanditaire c = getForUpdate(id);
        normaliserSoldes(c);
        if (c.getSoldeReserve().compareTo(montant) < 0) throw new IllegalStateException("Budget réservé du commanditaire insuffisant");
        c.setSoldeReserve(c.getSoldeReserve().subtract(montant));
        c.setSoldeDisponible(c.getSoldeDisponible().add(montant));
        repository.save(c);
        enregistrer(c, MouvementCommanditaire.Type.LIBERATION, montant, sondageId, "SONDAGE-" + sondageId, "Reliquat du sondage libéré");
    }

    @Transactional(readOnly = true)
    public Commanditaire exigerActif(UUID id) {
        Commanditaire c = get(id);
        if (c.getStatut() != StatutCommanditaire.ACTIF) throw new IllegalStateException("Le commanditaire sélectionné n'est pas actif");
        return c;
    }

    private void enregistrer(Commanditaire c, MouvementCommanditaire.Type type, BigDecimal montant,
                              UUID sondageId, String reference, String description) {
        mouvementRepository.save(MouvementCommanditaire.builder().commanditaire(c).type(type).montant(montant)
                .soldeApres(zero(c.getSoldeDisponible())).sondageId(sondageId).reference(reference)
                .description(description).build());
    }

    private CommanditaireResponse toResponse(Commanditaire c) {
        return toResponse(c, nombreSondages(c.getId()), sondagesActifs(c.getId()));
    }

    private CommanditaireResponse toResponse(Commanditaire c, long nombreSondages, long sondagesActifs) {
        normaliserSoldes(c);
        return CommanditaireResponse.builder().id(c.getId()).nom(c.getNom()).prenom(c.getPrenom())
                .societe(c.getSociete()).email(c.getEmail()).telephone(c.getTelephone()).statut(c.getStatut())
                .soldeDisponible(c.getSoldeDisponible()).soldeReserve(c.getSoldeReserve())
                .totalAlimente(c.getTotalAlimente()).totalDistribue(c.getTotalDistribue())
                .motifStatut(c.getMotifStatut()).createdAt(c.getCreatedAt()).updatedAt(c.getUpdatedAt())
                .nombreSondages(nombreSondages).sondagesActifs(sondagesActifs).build();
    }

    private Map<UUID, long[]> statistiquesSondages() {
        Map<UUID, long[]> statistiques = new HashMap<>();
        jdbcTemplate.query("""
                select commanditaire_id,
                       count(*) as total,
                       sum(case when statut in ('ACTIF', 'EN_ATTENTE_DISTRIBUTION') then 1 else 0 end) as actifs
                from sondages
                where commanditaire_id is not null
                group by commanditaire_id
                """, (RowCallbackHandler) rs -> statistiques.put(
                rs.getObject("commanditaire_id", UUID.class),
                new long[]{rs.getLong("total"), rs.getLong("actifs")}
        ));
        return statistiques;
    }

    private long nombreSondages(UUID id) {
        Long value = jdbcTemplate.queryForObject("select count(*) from sondages where commanditaire_id = ?", Long.class, id);
        return value == null ? 0 : value;
    }

    private long sondagesActifs(UUID id) {
        Long value = jdbcTemplate.queryForObject("select count(*) from sondages where commanditaire_id = ? and statut in ('ACTIF','EN_ATTENTE_DISTRIBUTION')", Long.class, id);
        return value == null ? 0 : value;
    }

    private void verifierUnicite(String email, String telephone, UUID id) {
        boolean emailPris = id == null ? repository.existsByEmailIgnoreCase(email) : repository.existsByEmailIgnoreCaseAndIdNot(email, id);
        boolean telPris = id == null ? repository.existsByTelephone(telephone) : repository.existsByTelephoneAndIdNot(telephone, id);
        if (emailPris) throw new IllegalStateException("Un commanditaire utilise déjà cet email");
        if (telPris) throw new IllegalStateException("Un commanditaire utilise déjà ce numéro de téléphone");
    }

    private Commanditaire get(UUID id) { return repository.findById(id).orElseThrow(() -> new IllegalArgumentException("Commanditaire introuvable")); }
    private Commanditaire getForUpdate(UUID id) { return repository.findWithLockById(id).orElseThrow(() -> new IllegalArgumentException("Commanditaire introuvable")); }
    private String email(String value) { return value.trim().toLowerCase(Locale.ROOT); }
    private String telephone(String value) {
        String normalized = value.replaceAll("[\\s().-]", "");
        if (!normalized.matches("^\\+[1-9][0-9]{7,14}$")) {
            throw new IllegalArgumentException("Le téléphone doit être un numéro international valide");
        }
        return normalized;
    }
    private BigDecimal zero(BigDecimal value) { return value == null ? BigDecimal.ZERO : value; }
    private void normaliserSoldes(Commanditaire c) {
        if (c.getSoldeDisponible() == null) c.setSoldeDisponible(BigDecimal.ZERO);
        if (c.getSoldeReserve() == null) c.setSoldeReserve(BigDecimal.ZERO);
        if (c.getTotalAlimente() == null) c.setTotalAlimente(BigDecimal.ZERO);
        if (c.getTotalDistribue() == null) c.setTotalDistribue(BigDecimal.ZERO);
    }
}
