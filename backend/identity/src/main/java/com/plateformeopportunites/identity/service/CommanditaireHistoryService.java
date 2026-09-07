package com.plateformeopportunites.identity.service;

import com.plateformeopportunites.identity.dto.AlimenterCommanditaireRequest;
import com.plateformeopportunites.identity.dto.MouvementCommanditaireResponse;
import com.plateformeopportunites.identity.entity.Commanditaire;
import com.plateformeopportunites.identity.entity.MouvementCommanditaire;
import com.plateformeopportunites.identity.repository.CommanditaireRepository;
import com.plateformeopportunites.identity.repository.MouvementCommanditaireRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CommanditaireHistoryService {
    private final CommanditaireRepository commanditaireRepository;
    private final MouvementCommanditaireRepository mouvementRepository;

    @Transactional
    public Commanditaire alimenter(UUID id, AlimenterCommanditaireRequest request) {
        Commanditaire commanditaire = commanditaireRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Commanditaire introuvable"));
        BigDecimal montant = request.getMontant();
        BigDecimal solde = commanditaire.getSoldeDisponible() == null ? BigDecimal.ZERO : commanditaire.getSoldeDisponible();
        commanditaire.setSoldeDisponible(solde.add(montant));
        BigDecimal total = commanditaire.getTotalAlimente() == null ? BigDecimal.ZERO : commanditaire.getTotalAlimente();
        commanditaire.setTotalAlimente(total.add(montant));
        commanditaireRepository.save(commanditaire);
        mouvementRepository.save(MouvementCommanditaire.builder()
                .commanditaire(commanditaire).type(MouvementCommanditaire.Type.ALIMENTATION)
                .montant(montant).soldeApres(commanditaire.getSoldeDisponible())
                .reference(request.getReference()).description(request.getDescription()).build());
        return commanditaire;
    }

    @Transactional(readOnly = true)
    public List<MouvementCommanditaireResponse> mouvements(UUID id) {
        if (!commanditaireRepository.existsById(id)) throw new IllegalArgumentException("Commanditaire introuvable");
        return mouvementRepository.findTop50ByCommanditaireIdOrderByCreatedAtDesc(id).stream()
                .map(mouvement -> MouvementCommanditaireResponse.builder()
                        .id(mouvement.getId()).type(mouvement.getType().name()).montant(mouvement.getMontant())
                        .soldeApres(mouvement.getSoldeApres()).sondageId(mouvement.getSondageId())
                        .reference(mouvement.getReference()).description(mouvement.getDescription())
                        .createdAt(mouvement.getCreatedAt()).build())
                .toList();
    }
}
