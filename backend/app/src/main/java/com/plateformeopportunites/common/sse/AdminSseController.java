package com.plateformeopportunites.common.sse;

import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@RestController
@RequestMapping("/api/admin/events")
@RequiredArgsConstructor
public class AdminSseController {

    private final SseService sseService;

    @GetMapping(value = "/global", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter global() {
        return sseService.subscribe("admin:global");
    }
}
