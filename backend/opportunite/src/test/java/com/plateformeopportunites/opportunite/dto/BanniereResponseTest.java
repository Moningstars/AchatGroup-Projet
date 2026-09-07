package com.plateformeopportunites.opportunite.dto;

import com.plateformeopportunites.common.enums.PageCible;
import com.plateformeopportunites.opportunite.entity.Banniere;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.assertEquals;

class BanniereResponseTest {

    private final LocalDateTime maintenant = LocalDateTime.of(2026, 9, 5, 12, 0);

    @Test
    void calculeLesCinqStatutsDeDiffusion() {
        assertEquals("BROUILLON", BanniereResponse.calculerStatut(banniere(true, true, null, null), maintenant));
        assertEquals("MASQUEE", BanniereResponse.calculerStatut(banniere(false, false, null, null), maintenant));
        assertEquals("PROGRAMMEE", BanniereResponse.calculerStatut(banniere(true, false, maintenant.plusDays(1), null), maintenant));
        assertEquals("EXPIREE", BanniereResponse.calculerStatut(banniere(true, false, null, maintenant.minusMinutes(1)), maintenant));
        assertEquals("EN_LIGNE", BanniereResponse.calculerStatut(banniere(true, false, maintenant.minusDays(1), maintenant.plusDays(1)), maintenant));
    }

    @Test
    void calculeLeTauxDeClicAvecDeuxDecimales() {
        Banniere banniere = banniere(true, false, null, null);
        banniere.setImpressions(300L);
        banniere.setClics(10L);

        BanniereResponse response = BanniereResponse.from(banniere);

        assertEquals(3.33D, response.getTauxClic());
    }

    private Banniere banniere(boolean actif, boolean brouillon,
                               LocalDateTime dateDebut, LocalDateTime dateFin) {
        return Banniere.builder()
                .titre("Campagne")
                .imageUrl("/uploads/bannieres/test.jpg")
                .pageCible(PageCible.ACCUEIL)
                .ordre(0)
                .actif(actif)
                .brouillon(brouillon)
                .dateDebut(dateDebut)
                .dateFin(dateFin)
                .build();
    }
}
