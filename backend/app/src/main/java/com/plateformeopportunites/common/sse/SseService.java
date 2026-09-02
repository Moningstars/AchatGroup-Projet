package com.plateformeopportunites.common.sse;

import com.plateformeopportunites.common.event.SseNotificationEvent;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

@Service
@Slf4j
public class SseService {

    private static final long TIMEOUT_MS = 1_800_000L; // 30 minutes

    private final ConcurrentHashMap<String, CopyOnWriteArrayList<SseEmitter>> emitters =
            new ConcurrentHashMap<>();

    public SseEmitter subscribe(String canal) {
        SseEmitter emitter = new SseEmitter(TIMEOUT_MS);
        emitters.computeIfAbsent(canal, k -> new CopyOnWriteArrayList<>()).add(emitter);

        emitter.onCompletion(() -> retirer(canal, emitter));
        emitter.onTimeout(() -> retirer(canal, emitter));
        emitter.onError(e -> retirer(canal, emitter));

        try {
            emitter.send(SseEmitter.event().name("connecte").data("ok"));
        } catch (IOException e) {
            retirer(canal, emitter);
        }

        return emitter;
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onNotification(SseNotificationEvent event) {
        pousser(event.getCanal(), event.getType(), event.getPayload());
    }

    private void pousser(String canal, String type, String data) {
        List<SseEmitter> liste = emitters.get(canal);
        if (liste == null || liste.isEmpty()) return;

        List<SseEmitter> morts = new ArrayList<>();
        for (SseEmitter emitter : liste) {
            try {
                emitter.send(SseEmitter.event().name(type).data(data));
            } catch (IOException e) {
                morts.add(emitter);
            }
        }
        liste.removeAll(morts);
    }

    private void retirer(String canal, SseEmitter emitter) {
        CopyOnWriteArrayList<SseEmitter> liste = emitters.get(canal);
        if (liste != null) liste.remove(emitter);
    }
}
