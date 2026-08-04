package com.plateformeopportunites.finance.listener;

import com.plateformeopportunites.common.event.UtilisateurCreeEvent;
import com.plateformeopportunites.finance.entity.Portefeuille;
import com.plateformeopportunites.finance.repository.PortefeuilleRepository;
import com.plateformeopportunites.identity.repository.UtilisateurRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@RequiredArgsConstructor
@Slf4j
public class PortefeuilleCreationListener {

    private final PortefeuilleRepository portefeuilleRepository;
    private final UtilisateurRepository utilisateurRepository;

    @EventListener
    @Transactional
    public void onUtilisateurCree(UtilisateurCreeEvent event) {
        utilisateurRepository.findById(event.getUtilisateurId()).ifPresent(utilisateur -> {
            if (portefeuilleRepository.findByUtilisateurId(utilisateur.getId()).isEmpty()) {
                portefeuilleRepository.save(Portefeuille.builder().utilisateur(utilisateur).build());
                log.debug("Portefeuille créé pour l'utilisateur {}", utilisateur.getId());
            }
        });
    }
}
