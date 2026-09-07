package com.plateformeopportunites.sondage.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.util.ReflectionTestUtils;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

class SondageImageStorageServiceTest {

    @TempDir
    Path tempDir;

    private SondageImageStorageService service;

    @BeforeEach
    void setUp() {
        service = new SondageImageStorageService();
        ReflectionTestUtils.setField(service, "uploadDir", tempDir.toString());
    }

    @Test
    void stockePuisSupprimeUneImagePngValide() throws Exception {
        ByteArrayOutputStream output = new ByteArrayOutputStream();
        ImageIO.write(new BufferedImage(4, 4, BufferedImage.TYPE_INT_RGB), "png", output);
        MockMultipartFile fichier = new MockMultipartFile(
                "file", "couverture.png", "image/png", output.toByteArray());

        String url = service.stocker(fichier, UUID.randomUUID());
        Path fichierStocke = tempDir.resolve(url.substring("/uploads/".length()));

        assertTrue(url.startsWith("/uploads/sondages/"));
        assertTrue(Files.isRegularFile(fichierStocke));
        service.supprimer(url);
        assertFalse(Files.exists(fichierStocke));
    }

    @Test
    void refuseUnFauxFichierImage() {
        MockMultipartFile fichier = new MockMultipartFile(
                "file", "couverture.png", "image/png", "contenu non image".getBytes());

        IllegalArgumentException erreur = assertThrows(
                IllegalArgumentException.class,
                () -> service.stocker(fichier, UUID.randomUUID()));

        assertTrue(erreur.getMessage().contains("JPEG et PNG"));
    }

    @Test
    void refuseUnTypeDeclareDifferentDuContenu() throws Exception {
        ByteArrayOutputStream output = new ByteArrayOutputStream();
        ImageIO.write(new BufferedImage(2, 2, BufferedImage.TYPE_INT_RGB), "png", output);
        MockMultipartFile fichier = new MockMultipartFile(
                "file", "couverture.jpg", "image/jpeg", output.toByteArray());

        IllegalArgumentException erreur = assertThrows(
                IllegalArgumentException.class,
                () -> service.stocker(fichier, UUID.randomUUID()));

        assertTrue(erreur.getMessage().contains("type déclaré"));
    }

    @Test
    void ignoreLaSuppressionDuneUrlExterne() {
        assertDoesNotThrow(() -> service.supprimer("https://cdn.example/image.png"));
        assertFalse(Files.exists(tempDir.resolve("cdn.example")));
    }
}
