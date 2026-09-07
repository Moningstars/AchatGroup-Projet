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

class PreuveStorageServiceTest {

    @TempDir
    Path tempDir;

    private PreuveStorageService service;

    @BeforeEach
    void setUp() {
        service = new PreuveStorageService();
        ReflectionTestUtils.setField(service, "uploadDir", tempDir.toString());
    }

    @Test
    void stockeEtRechargeUneImagePngValide() throws Exception {
        ByteArrayOutputStream output = new ByteArrayOutputStream();
        ImageIO.write(new BufferedImage(4, 4, BufferedImage.TYPE_INT_RGB), "png", output);
        MockMultipartFile fichier = new MockMultipartFile(
                "file", "preuve.png", "image/png", output.toByteArray());

        String url = service.stocker(fichier, UUID.randomUUID());
        PreuveStorageService.PreuveStockee preuve = service.charger(url);

        assertTrue(url.startsWith("/uploads/preuves/"));
        assertEquals("image/png", preuve.mediaType().toString());
        assertTrue(preuve.resource().exists());

        service.supprimer(url);
        assertFalse(preuve.resource().exists());
    }

    @Test
    void refuseUnFichierQuiUsurpeUnTypeImage() {
        MockMultipartFile fichier = new MockMultipartFile(
                "file", "preuve.png", "image/png", "contenu non image".getBytes());

        IllegalArgumentException erreur = assertThrows(
                IllegalArgumentException.class,
                () -> service.stocker(fichier, UUID.randomUUID()));

        assertTrue(erreur.getMessage().contains("JPEG, PNG et PDF"));
    }

    @Test
    void refuseUnTypeDeclareDifferentDuContenu() {
        byte[] pdf = "%PDF-1.7\n".getBytes();
        MockMultipartFile fichier = new MockMultipartFile(
                "file", "preuve.png", "image/png", pdf);

        IllegalArgumentException erreur = assertThrows(
                IllegalArgumentException.class,
                () -> service.stocker(fichier, UUID.randomUUID()));

        assertTrue(erreur.getMessage().contains("type déclaré"));
    }

    @Test
    void refuseLesCheminsHorsDuDossierDesPreuves() {
        assertThrows(IllegalArgumentException.class,
                () -> service.charger("/uploads/preuves/../../secrets.properties"));
        assertFalse(Files.exists(tempDir.resolve("secrets.properties")));
    }
}
