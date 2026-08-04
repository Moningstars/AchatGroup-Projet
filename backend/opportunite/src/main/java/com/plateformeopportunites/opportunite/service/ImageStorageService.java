package com.plateformeopportunites.opportunite.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.UUID;

@Service
public class ImageStorageService {

    @Value("${app.upload-dir:./uploads}")
    private String uploadDir;

    public String stocker(MultipartFile file, UUID opportuniteId) throws IOException {
        String extension = getExtension(file.getOriginalFilename());
        String filename = UUID.randomUUID() + "." + extension;
        Path dir = Path.of(uploadDir, "opportunites", opportuniteId.toString());
        Files.createDirectories(dir);
        Files.copy(file.getInputStream(), dir.resolve(filename), StandardCopyOption.REPLACE_EXISTING);
        return "/uploads/opportunites/" + opportuniteId + "/" + filename;
    }

    public void supprimer(String url) {
        if (url == null || !url.startsWith("/uploads/")) return;
        Path file = Path.of(uploadDir, url.substring("/uploads/".length()));
        try {
            Files.deleteIfExists(file);
        } catch (IOException ignored) {
        }
    }

    private String getExtension(String filename) {
        if (filename == null || filename.isBlank()) return "jpg";
        int dot = filename.lastIndexOf('.');
        return dot >= 0 ? filename.substring(dot + 1).toLowerCase() : "jpg";
    }
}
