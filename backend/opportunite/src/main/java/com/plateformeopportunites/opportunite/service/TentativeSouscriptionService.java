package com.plateformeopportunites.opportunite.service;

import com.plateformeopportunites.identity.entity.Utilisateur;
import com.plateformeopportunites.opportunite.dto.TentativeSouscriptionResponse;
import com.plateformeopportunites.opportunite.entity.Opportunite;
import com.plateformeopportunites.opportunite.entity.TentativeSouscription;
import com.plateformeopportunites.opportunite.repository.TentativeSouscriptionRepository;
import com.plateformeopportunites.opportunite.repository.OpportuniteRepository;
import com.plateformeopportunites.identity.repository.UtilisateurRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class TentativeSouscriptionService {
    private final TentativeSouscriptionRepository repository;
    private final OpportuniteRepository opportuniteRepository;
    private final UtilisateurRepository utilisateurRepository;

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void enregistrer(java.util.UUID opportuniteId, java.util.UUID utilisateurId, Integer quantite, Throwable erreur) {
        Opportunite opportunite = opportuniteRepository.findById(opportuniteId).orElse(null);
        Utilisateur utilisateur = utilisateurRepository.findById(utilisateurId).orElse(null);
        if (opportunite == null || utilisateur == null) return;
        String message = erreur.getMessage() == null ? "Erreur non détaillée" : erreur.getMessage();
        repository.save(TentativeSouscription.builder()
                .opportunite(opportunite)
                .utilisateur(utilisateur)
                .quantite(quantite == null ? 0 : quantite)
                .motif(classer(message))
                .detail(message.length() > 500 ? message.substring(0, 500) : message)
                .build());
    }

    @Transactional(readOnly = true)
    public List<TentativeSouscriptionResponse> listerRecentes() {
        return repository.findTop100ByOrderByCreatedAtDesc().stream().map(t -> TentativeSouscriptionResponse.builder()
                .id(t.getId())
                .opportuniteId(t.getOpportunite().getId())
                .opportuniteTitre(t.getOpportunite().getTitre())
                .utilisateurId(t.getUtilisateur().getId())
                .utilisateurNom(t.getUtilisateur().getNom())
                .utilisateurTelephone(t.getUtilisateur().getTelephone())
                .quantite(t.getQuantite())
                .motif(t.getMotif())
                .detail(t.getDetail())
                .createdAt(t.getCreatedAt())
                .build()).toList();
    }

    private String classer(String message) {
        String normalized = message.toLowerCase();
        if (normalized.contains("solde") || normalized.contains("fonds") || normalized.contains("portefeuille")) return "SOLDE_INSUFFISANT";
        if (normalized.contains("expir") || normalized.contains("active") || normalized.contains("plafond") || normalized.contains("place")) return "OFFRE_INDISPONIBLE";
        if (normalized.contains("quantité") || normalized.contains("déjà")) return "VALIDATION";
        return "ERREUR_TECHNIQUE";
    }
}
