package com.plateformeopportunites.common.event;

import lombok.Getter;
import org.springframework.context.ApplicationEvent;
import java.util.UUID;

@Getter
public class RecompenseEvent extends ApplicationEvent {

    private final UUID sondageId;
    private final UUID participantId;

    public RecompenseEvent(Object source, UUID sondageId, UUID participantId) {
        super(source);
        this.sondageId = sondageId;
        this.participantId = participantId;
    }
}
