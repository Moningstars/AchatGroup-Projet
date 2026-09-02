package com.plateformeopportunites.common.event;

import lombok.Getter;
import org.springframework.context.ApplicationEvent;

@Getter
public class SseNotificationEvent extends ApplicationEvent {

    private final String canal;  // "opportunite:{uuid}", "sondage:{uuid}", "user:{uuid}"
    private final String type;   // "COMPTEUR", "STATUT", "RECOMPENSE", "KYC", "RETRAIT"
    private final String payload; // JSON string

    public SseNotificationEvent(Object source, String canal, String type, String payload) {
        super(source);
        this.canal = canal;
        this.type = type;
        this.payload = payload;
    }
}
