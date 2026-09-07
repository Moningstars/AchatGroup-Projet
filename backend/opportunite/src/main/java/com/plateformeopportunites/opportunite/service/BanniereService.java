package com.plateformeopportunites.opportunite.service;

import com.plateformeopportunites.common.enums.PageCible;
import com.plateformeopportunites.opportunite.dto.BanniereResponse;
import com.plateformeopportunites.opportunite.entity.Banniere;
import com.plateformeopportunites.opportunite.repository.BanniereRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class BanniereService {

    private static final long TAILLE_MAX_IMAGE = 8L * 1024 * 1024;
    private static final int LARGEUR_MIN = 320;
    private static final int HAUTEUR_MIN = 120;
    private static final int DIMENSION_MAX = 6000;

    private final BanniereRepository banniereRepository;
    private final ImageStorageService imageStorageService;

    @Value("${app.upload-dir:./uploads}")
    private String uploadDir;

    @Transactional(readOnly = true)
    public List<BanniereResponse> getActives(PageCible page) {
        return banniereRepository.findActives(page, LocalDateTime.now())
                .stream().map(BanniereResponse::from).toList();
    }

    @Transactional
    public List<BanniereResponse> getAll() {
        List<Banniere> bannieres = banniereRepository.findAllByOrderByOrdreAsc();
        normaliserOrdres(bannieres);
        return bannieres.stream().map(BanniereResponse::from).toList();
    }

    @EventListener(ApplicationReadyEvent.class)
    @Transactional
    public void normaliserCampagnesAuDemarrage() {
        normaliserOrdres(banniereRepository.findAllByOrderByOrdreAsc());
    }

    @Transactional
    public BanniereResponse creer(MultipartFile image, String titre, String description,
                                   String tag, String icone, PageCible pageCible,
                                   String lien, Integer ordre,
                                   LocalDateTime dateDebut, LocalDateTime dateFin,
                                   boolean publier) throws IOException {
        validerChamps(titre, pageCible, lien, dateDebut, dateFin);
        String imageUrl = stockerBanniere(image);
        Banniere b = Banniere.builder()
                .titre(titre.trim())
                .description(nettoyer(description))
                .tag(nettoyer(tag))
                .icone(nettoyer(icone))
                .imageUrl(imageUrl)
                .pageCible(pageCible)
                .lien(nettoyer(lien))
                .ordre(ordre != null ? Math.max(0, ordre) : (int) banniereRepository.count())
                .actif(publier)
                .brouillon(!publier)
                .impressions(0L)
                .clics(0L)
                .dateDebut(dateDebut)
                .dateFin(dateFin)
                .build();
        try {
            Banniere sauvegardee = banniereRepository.save(b);
            List<Banniere> toutes = banniereRepository.findAllByOrderByOrdreAsc();
            normaliserOrdres(toutes);
            return BanniereResponse.from(sauvegardee);
        } catch (RuntimeException exception) {
            imageStorageService.supprimer(imageUrl);
            throw exception;
        }
    }

    @Transactional
    public BanniereResponse modifier(UUID id, MultipartFile image, String titre, String description,
                                      String tag, String icone, PageCible pageCible,
                                      String lien, Integer ordre,
                                      LocalDateTime dateDebut, LocalDateTime dateFin,
                                      Boolean publier) throws IOException {
        Banniere b = findOrThrow(id);
        String titreFinal = titre != null ? titre : b.getTitre();
        PageCible pageFinale = pageCible != null ? pageCible : b.getPageCible();
        String lienFinal = lien != null ? lien : b.getLien();
        validerChamps(titreFinal, pageFinale, lienFinal, dateDebut, dateFin);

        String ancienneImage = b.getImageUrl();
        String nouvelleImage = null;
        if (image != null && !image.isEmpty()) {
            nouvelleImage = stockerBanniere(image);
        }

        if (titre != null) b.setTitre(titre.trim());
        if (description != null) b.setDescription(nettoyer(description));
        if (tag != null) b.setTag(nettoyer(tag));
        if (icone != null) b.setIcone(nettoyer(icone));
        if (pageCible != null) b.setPageCible(pageCible);
        if (lien != null) b.setLien(nettoyer(lien));
        if (ordre != null) b.setOrdre(Math.max(0, ordre));
        b.setDateDebut(dateDebut);
        b.setDateFin(dateFin);
        if (publier != null) {
            b.setBrouillon(!publier);
            b.setActif(publier);
        }
        if (nouvelleImage != null) b.setImageUrl(nouvelleImage);

        try {
            Banniere sauvegardee = banniereRepository.save(b);
            if (nouvelleImage != null) imageStorageService.supprimer(ancienneImage);
            return BanniereResponse.from(sauvegardee);
        } catch (RuntimeException exception) {
            if (nouvelleImage != null) imageStorageService.supprimer(nouvelleImage);
            throw exception;
        }
    }

    @Transactional
    public BanniereResponse toggleActif(UUID id) {
        Banniere b = findOrThrow(id);
        if (Boolean.TRUE.equals(b.getBrouillon())) {
            b.setBrouillon(false);
            b.setActif(true);
        } else {
            b.setActif(!Boolean.TRUE.equals(b.getActif()));
        }
        return BanniereResponse.from(banniereRepository.save(b));
    }

    @Transactional
    public List<BanniereResponse> reordonner(List<UUID> ids) {
        if (ids == null) throw new IllegalArgumentException("La liste de classement est obligatoire.");
        List<Banniere> toutes = banniereRepository.findAllByOrderByOrdreAsc();
        if (ids.size() != toutes.size() || new HashSet<>(ids).size() != ids.size()) {
            throw new IllegalArgumentException("Le classement doit contenir chaque bannière exactement une fois.");
        }
        var parId = toutes.stream().collect(java.util.stream.Collectors.toMap(Banniere::getId, b -> b));
        List<Banniere> ordonnees = new ArrayList<>();
        for (int index = 0; index < ids.size(); index++) {
            Banniere b = parId.get(ids.get(index));
            if (b == null) throw new IllegalArgumentException("Une bannière du classement est introuvable.");
            b.setOrdre(index);
            ordonnees.add(b);
        }
        banniereRepository.saveAll(ordonnees);
        return ordonnees.stream().map(BanniereResponse::from).toList();
    }

    @Transactional
    public void enregistrerImpression(UUID id) {
        Banniere b = findOrThrow(id);
        if ("EN_LIGNE".equals(BanniereResponse.calculerStatut(b, LocalDateTime.now()))) {
            banniereRepository.incrementerImpressions(id);
        }
    }

    @Transactional
    public void enregistrerClic(UUID id) {
        Banniere b = findOrThrow(id);
        if ("EN_LIGNE".equals(BanniereResponse.calculerStatut(b, LocalDateTime.now()))
                && b.getLien() != null && !b.getLien().isBlank()) {
            banniereRepository.incrementerClics(id);
        }
    }

    @Transactional
    public void supprimer(UUID id) {
        Banniere b = findOrThrow(id);
        imageStorageService.supprimer(b.getImageUrl());
        banniereRepository.delete(b);
        normaliserOrdres(banniereRepository.findAllByOrderByOrdreAsc());
    }

    private Banniere findOrThrow(UUID id) {
        return banniereRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Bannière introuvable : " + id));
    }

    private void normaliserOrdres(List<Banniere> bannieres) {
        boolean modifie = false;
        for (int index = 0; index < bannieres.size(); index++) {
            Banniere banniere = bannieres.get(index);
            if (!Integer.valueOf(index).equals(banniere.getOrdre())) {
                banniere.setOrdre(index);
                modifie = true;
            }
            if (banniere.getBrouillon() == null) {
                banniere.setBrouillon(false);
                modifie = true;
            }
            if (banniere.getImpressions() == null) {
                banniere.setImpressions(0L);
                modifie = true;
            }
            if (banniere.getClics() == null) {
                banniere.setClics(0L);
                modifie = true;
            }
        }
        if (modifie) banniereRepository.saveAll(bannieres);
    }

    private void validerChamps(String titre, PageCible pageCible, String lien,
                                LocalDateTime dateDebut, LocalDateTime dateFin) {
        if (titre == null || titre.isBlank()) throw new IllegalArgumentException("Le titre est obligatoire.");
        if (titre.trim().length() > 120) throw new IllegalArgumentException("Le titre ne peut pas dépasser 120 caractères.");
        if (pageCible == null) throw new IllegalArgumentException("La destination est obligatoire.");
        if (dateDebut != null && dateFin != null && dateFin.isBefore(dateDebut)) {
            throw new IllegalArgumentException("La date de fin doit être postérieure à la date de début.");
        }
        String lienNettoye = nettoyer(lien);
        if (lienNettoye != null && !(lienNettoye.startsWith("/") || lienNettoye.matches("(?i)^https?://.+"))) {
            throw new IllegalArgumentException("Le lien doit être un chemin interne ou une adresse HTTP(S).");
        }
    }

    private String stockerBanniere(MultipartFile file) throws IOException {
        if (file == null || file.isEmpty()) throw new IllegalArgumentException("Une image est obligatoire.");
        if (file.getSize() > TAILLE_MAX_IMAGE) throw new IllegalArgumentException("L'image ne doit pas dépasser 8 Mo.");

        byte[] donnees = file.getBytes();
        TypeImage type = detecterType(donnees);
        String typeDeclare = file.getContentType();
        if (typeDeclare == null || !type.mime().equalsIgnoreCase(typeDeclare)) {
            throw new IllegalArgumentException("Le contenu réel de l'image ne correspond pas à son type déclaré.");
        }
        BufferedImage image = ImageIO.read(new ByteArrayInputStream(donnees));
        if (image == null) throw new IllegalArgumentException("Le fichier fourni n'est pas une image valide.");
        if (image.getWidth() < LARGEUR_MIN || image.getHeight() < HAUTEUR_MIN) {
            throw new IllegalArgumentException("L'image doit mesurer au moins 320 × 120 pixels.");
        }
        if (image.getWidth() > DIMENSION_MAX || image.getHeight() > DIMENSION_MAX) {
            throw new IllegalArgumentException("Les dimensions de l'image ne doivent pas dépasser 6000 pixels.");
        }

        String filename = UUID.randomUUID() + "." + type.extension();
        Path dir = Path.of(uploadDir, "bannieres").toAbsolutePath().normalize();
        Files.createDirectories(dir);
        Path destination = dir.resolve(filename).normalize();
        if (!destination.startsWith(dir)) throw new IllegalArgumentException("Chemin de fichier invalide.");
        Files.write(destination, donnees);
        return "/uploads/bannieres/" + filename;
    }

    private TypeImage detecterType(byte[] donnees) {
        if (donnees.length >= 8
                && (donnees[0] & 0xFF) == 0x89 && donnees[1] == 0x50 && donnees[2] == 0x4E && donnees[3] == 0x47) {
            return new TypeImage("png", "image/png");
        }
        if (donnees.length >= 3
                && (donnees[0] & 0xFF) == 0xFF && (donnees[1] & 0xFF) == 0xD8 && (donnees[2] & 0xFF) == 0xFF) {
            return new TypeImage("jpg", "image/jpeg");
        }
        if (donnees.length >= 6
                && donnees[0] == 'G' && donnees[1] == 'I' && donnees[2] == 'F'
                && donnees[3] == '8' && (donnees[4] == '7' || donnees[4] == '9') && donnees[5] == 'a') {
            return new TypeImage("gif", "image/gif");
        }
        throw new IllegalArgumentException("Format refusé. Utilisez une image JPEG, PNG ou GIF.");
    }

    private String nettoyer(String valeur) {
        if (valeur == null || valeur.isBlank()) return null;
        return valeur.trim();
    }

    private record TypeImage(String extension, String mime) {}
}
