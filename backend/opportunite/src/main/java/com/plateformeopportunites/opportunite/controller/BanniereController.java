package com.plateformeopportunites.opportunite.controller;

import com.plateformeopportunites.common.enums.PageCible;
import com.plateformeopportunites.opportunite.dto.BanniereResponse;
import com.plateformeopportunites.opportunite.service.BanniereService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/bannieres")
@RequiredArgsConstructor
public class BanniereController {

    private final BanniereService banniereService;

    @GetMapping
    public List<BanniereResponse> getActives(@RequestParam PageCible page) {
        return banniereService.getActives(page);
    }
}
