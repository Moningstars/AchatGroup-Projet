package com.plateformeopportunites.common.event;

import lombok.Getter;
import org.springframework.context.ApplicationEvent;
import java.math.BigDecimal;
import java.util.UUID;

@Getter
public class RetraitDemandeEvent extends ApplicationEvent {

    private final UUID participantId;
    private final BigDecimal montant;

    public RetraitDemandeEvent(Object source, UUID participantId, BigDecimal montant) {
        super(source);
        this.participantId = participantId;
        this.montant = montant;
    }
}
