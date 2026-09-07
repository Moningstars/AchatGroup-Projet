package com.plateformeopportunites.sondage.service;

import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.MediaType;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import javax.imageio.ImageIO;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.UUID;

@Service
public class PreuveStorageService {

    private static final long TAILLE_MAX = 8L * 1024 * 1024;

    @Value("${app.upload-dir:./uploads}")
    private String uploadDir;

    public String stocker(MultipartFile file, UUID sondageId) throws IOException {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Le justificatif est obligatoire.");
        }
        if (file.getSize() > TAILLE_MAX) {
            throw new IllegalArgumentException("Le justificatif ne doit pas dépasser 8 Mo.");
        }
        byte[] donnees = file.getBytes();
        TypePreuve type = detecterType(donnees);
        String typeDeclare = file.getContentType();
        if (typeDeclare == null || !type.correspond(typeDeclare)) {
            throw new IllegalArgumentException("Le contenu réel du justificatif ne correspond pas à son type déclaré.");
        }
        if (type.image() && ImageIO.read(new ByteArrayInputStream(donnees)) == null) {
            throw new IllegalArgumentException("L'image justificative est illisible.");
        }

        String filename = UUID.randomUUID() + "." + type.extension();
        Path dir = Path.of(uploadDir, "preuves", sondageId.toString()).toAbsolutePath().normalize();
        Files.createDirectories(dir);
        Path destination = dir.resolve(filename).normalize();
        if (!destination.startsWith(dir)) throw new IllegalArgumentException("Chemin de fichier invalide.");
        Files.write(destination, donnees);
        return "/uploads/preuves/" + sondageId + "/" + filename;
    }

    public PreuveStockee charger(String url) throws IOException {
        Path fichier = resoudre(url);
        if (!Files.isRegularFile(fichier)) throw new IllegalArgumentException("Justificatif introuvable.");
        String type = Files.probeContentType(fichier);
        MediaType mediaType = type != null ? MediaType.parseMediaType(type) : MediaType.APPLICATION_OCTET_STREAM;
        return new PreuveStockee(new UrlResource(fichier.toUri()), mediaType, fichier.getFileName().toString());
    }

    public void supprimer(String url) {
        if (url == null || !url.startsWith("/uploads/preuves/")) return;
        try {
            Files.deleteIfExists(resoudre(url));
        } catch (IOException ignored) {
            // L'échec de nettoyage ne doit pas annuler la transaction métier.
        }
    }

    private Path resoudre(String url) {
        if (url == null || !url.startsWith("/uploads/preuves/")) {
            throw new IllegalArgumentException("Chemin de justificatif invalide.");
        }
        Path racine = Path.of(uploadDir, "preuves").toAbsolutePath().normalize();
        Path fichier = racine.resolve(url.substring("/uploads/preuves/".length())).normalize();
        if (!fichier.startsWith(racine)) throw new IllegalArgumentException("Chemin de justificatif invalide.");
        return fichier;
    }

    private TypePreuve detecterType(byte[] data) {
        if (data.length >= 8 && (data[0] & 0xFF) == 0x89 && data[1] == 0x50
                && data[2] == 0x4E && data[3] == 0x47) {
            return new TypePreuve("png", "image/png", true);
        }
        if (data.length >= 3 && (data[0] & 0xFF) == 0xFF
                && (data[1] & 0xFF) == 0xD8 && (data[2] & 0xFF) == 0xFF) {
            return new TypePreuve("jpg", "image/jpeg", true);
        }
        if (data.length >= 5 && data[0] == '%' && data[1] == 'P'
                && data[2] == 'D' && data[3] == 'F' && data[4] == '-') {
            return new TypePreuve("pdf", "application/pdf", false);
        }
        throw new IllegalArgumentException("Seuls les fichiers JPEG, PNG et PDF sont acceptés.");
    }

    public record PreuveStockee(Resource resource, MediaType mediaType, String filename) {}

    private record TypePreuve(String extension, String mime, boolean image) {
        boolean correspond(String declared) {
            return mime.equalsIgnoreCase(declared)
                    || ("image/jpeg".equals(mime) && "image/jpg".equalsIgnoreCase(declared));
        }
    }
}
