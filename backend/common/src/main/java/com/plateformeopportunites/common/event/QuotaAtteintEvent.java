package com.plateformeopportunites.common.event;

import lombok.Getter;
import org.springframework.context.ApplicationEvent;
import java.util.UUID;

@Getter
public class QuotaAtteintEvent extends ApplicationEvent {

    private final UUID opportuniteId;

    public QuotaAtteintEvent(Object source, UUID opportuniteId) {
        super(source);
        this.opportuniteId = opportuniteId;
    }
}
