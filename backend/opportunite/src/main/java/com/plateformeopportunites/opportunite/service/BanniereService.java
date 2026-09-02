package com.plateformeopportunites.opportunite.service;

import com.plateformeopportunites.common.enums.PageCible;
import com.plateformeopportunites.opportunite.dto.BanniereResponse;
import com.plateformeopportunites.opportunite.entity.Banniere;
import com.plateformeopportunites.opportunite.repository.BanniereRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class BanniereService {

    private final BanniereRepository banniereRepository;
    private final ImageStorageService imageStorageService;

    @Value("${app.upload-dir:./uploads}")
    private String uploadDir;

    // ── Lecture publique ──────────────────────────────────────────────────────

    public List<BanniereResponse> getActives(PageCible page) {
        return banniereRepository.findActives(page, LocalDateTime.now())
                .stream().map(BanniereResponse::from).toList();
    }

    // ── Admin CRUD ────────────────────────────────────────────────────────────

    public List<BanniereResponse> getAll() {
        return banniereRepository.findAllByOrderByOrdreAsc()
                .stream().map(BanniereResponse::from).toList();
    }

    public BanniereResponse creer(MultipartFile image, String titre, String description,
                                   String tag, String icone, PageCible pageCible,
                                   String lien, Integer ordre,
                                   LocalDateTime dateDebut, LocalDateTime dateFin) throws IOException {
        String imageUrl = stockerBanniere(image);
        Banniere b = Banniere.builder()
                .titre(titre)
                .description(description)
                .tag(tag)
                .icone(icone)
                .imageUrl(imageUrl)
                .pageCible(pageCible)
                .lien(lien)
                .ordre(ordre != null ? ordre : compterTotal())
                .actif(true)
                .dateDebut(dateDebut)
                .dateFin(dateFin)
                .build();
        return BanniereResponse.from(banniereRepository.save(b));
    }

    public BanniereResponse modifier(UUID id, MultipartFile image, String titre, String description,
                                      String tag, String icone, PageCible pageCible,
                                      String lien, Integer ordre,
                                      LocalDateTime dateDebut, LocalDateTime dateFin) throws IOException {
        Banniere b = findOrThrow(id);
        if (titre != null) b.setTitre(titre);
        if (description != null) b.setDescription(description);
        if (tag != null) b.setTag(tag);
        if (icone != null) b.setIcone(icone);
        if (pageCible != null) b.setPageCible(pageCible);
        if (lien != null) b.setLien(lien);
        if (ordre != null) b.setOrdre(ordre);
        b.setDateDebut(dateDebut);
        b.setDateFin(dateFin);
        if (image != null && !image.isEmpty()) {
            imageStorageService.supprimer(b.getImageUrl());
            b.setImageUrl(stockerBanniere(image));
        }
        return BanniereResponse.from(banniereRepository.save(b));
    }

    public BanniereResponse toggleActif(UUID id) {
        Banniere b = findOrThrow(id);
        b.setActif(!b.getActif());
        return BanniereResponse.from(banniereRepository.save(b));
    }

    public void supprimer(UUID id) {
        Banniere b = findOrThrow(id);
        imageStorageService.supprimer(b.getImageUrl());
        banniereRepository.delete(b);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private Banniere findOrThrow(UUID id) {
        return banniereRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Bannière introuvable : " + id));
    }

    private int compterTotal() {
        return (int) banniereRepository.count();
    }

    private String stockerBanniere(MultipartFile file) throws IOException {
        String extension = getExtension(file.getOriginalFilename());
        String filename = UUID.randomUUID() + "." + extension;
        Path dir = Path.of(uploadDir, "bannieres");
        Files.createDirectories(dir);
        Files.copy(file.getInputStream(), dir.resolve(filename), StandardCopyOption.REPLACE_EXISTING);
        return "/uploads/bannieres/" + filename;
    }

    private String getExtension(String filename) {
        if (filename == null || filename.isBlank()) return "jpg";
        int dot = filename.lastIndexOf('.');
        return dot >= 0 ? filename.substring(dot + 1).toLowerCase() : "jpg";
    }
}
