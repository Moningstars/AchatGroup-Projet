package com.plateformeopportunites.common.sse;

import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.UUID;

@RestController
@RequestMapping("/api/events")
@RequiredArgsConstructor
public class SseController {

    private final SseService sseService;

    @GetMapping(value = "/opportunite/{id}", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter opportunite(@PathVariable UUID id) {
        return sseService.subscribe("opportunite:" + id);
    }

    @GetMapping(value = "/sondage/{id}", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter sondage(@PathVariable UUID id) {
        return sseService.subscribe("sondage:" + id);
    }

    @GetMapping(value = "/notifications", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter notifications(Authentication auth) {
        return sseService.subscribe("user:" + auth.getName());
    }
}
