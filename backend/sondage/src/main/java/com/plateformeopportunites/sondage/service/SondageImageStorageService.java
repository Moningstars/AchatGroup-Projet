package com.plateformeopportunites.sondage.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.UUID;

@Service
public class SondageImageStorageService {

    private static final long TAILLE_MAX = 5L * 1024 * 1024;
    private static final long PIXELS_MAX = 20_000_000L;

    @Value("${app.upload-dir:./uploads}")
    private String uploadDir;

    public String stocker(MultipartFile file, UUID sondageId) throws IOException {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("L'image de couverture est obligatoire.");
        }
        if (file.getSize() > TAILLE_MAX) {
            throw new IllegalArgumentException("L'image de couverture ne doit pas dépasser 5 Mo.");
        }

        byte[] donnees = file.getBytes();
        TypeImage type = detecterType(donnees);
        if (file.getContentType() == null || !type.correspond(file.getContentType())) {
            throw new IllegalArgumentException("Le contenu réel de l'image ne correspond pas à son type déclaré.");
        }
        BufferedImage image = ImageIO.read(new ByteArrayInputStream(donnees));
        if (image == null) throw new IllegalArgumentException("L'image de couverture est illisible.");
        if ((long) image.getWidth() * image.getHeight() > PIXELS_MAX) {
            throw new IllegalArgumentException("Les dimensions de l'image sont trop grandes.");
        }

        String filename = UUID.randomUUID() + "." + type.extension();
        Path dir = Path.of(uploadDir, "sondages", sondageId.toString()).toAbsolutePath().normalize();
        Files.createDirectories(dir);
        Path destination = dir.resolve(filename).normalize();
        if (!destination.startsWith(dir)) throw new IllegalArgumentException("Chemin de fichier invalide.");
        Files.write(destination, donnees);
        return "/uploads/sondages/" + sondageId + "/" + filename;
    }

    public void supprimer(String url) {
        if (url == null || !url.startsWith("/uploads/sondages/")) return;
        try {
            Files.deleteIfExists(resoudre(url));
        } catch (IOException ignored) {
            // Le nettoyage ne doit pas annuler une mise à jour métier validée.
        }
    }

    private Path resoudre(String url) {
        Path racine = Path.of(uploadDir, "sondages").toAbsolutePath().normalize();
        Path fichier = racine.resolve(url.substring("/uploads/sondages/".length())).normalize();
        if (!fichier.startsWith(racine)) throw new IllegalArgumentException("Chemin d'image invalide.");
        return fichier;
    }

    private TypeImage detecterType(byte[] data) {
        if (data.length >= 8 && (data[0] & 0xFF) == 0x89 && data[1] == 0x50
                && data[2] == 0x4E && data[3] == 0x47) {
            return new TypeImage("png", "image/png");
        }
        if (data.length >= 3 && (data[0] & 0xFF) == 0xFF
                && (data[1] & 0xFF) == 0xD8 && (data[2] & 0xFF) == 0xFF) {
            return new TypeImage("jpg", "image/jpeg");
        }
        throw new IllegalArgumentException("Seules les images JPEG et PNG sont acceptées.");
    }

    private record TypeImage(String extension, String mime) {
        boolean correspond(String declared) {
            return mime.equalsIgnoreCase(declared)
                    || ("image/jpeg".equals(mime) && "image/jpg".equalsIgnoreCase(declared));
        }
    }
}
