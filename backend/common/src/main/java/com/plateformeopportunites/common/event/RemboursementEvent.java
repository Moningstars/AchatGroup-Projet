package com.plateformeopportunites.common.event;

import lombok.Getter;
import org.springframework.context.ApplicationEvent;
import java.util.UUID;

@Getter
public class RemboursementEvent extends ApplicationEvent {

    private final UUID opportuniteId;

    public RemboursementEvent(Object source, UUID opportuniteId) {
        super(source);
        this.opportuniteId = opportuniteId;
    }
}
