package com.plateformeopportunites.identity.service;

import com.plateformeopportunites.identity.entity.Otp;
import com.plateformeopportunites.identity.repository.OtpRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
@Slf4j
public class OtpService {

    private static final int EXPIRY_MINUTES = 5;
    private static final SecureRandom RANDOM = new SecureRandom();

    private final OtpRepository otpRepository;

    /**
     * Génère un code OTP à 6 chiffres, invalide les anciens codes non utilisés
     * et retourne le code généré.
     *
     * En production : remplacer le return par un appel à FastMessage (SMS)
     * ou un service d'email selon le format de l'identifiant.
     */
    @Transactional
    public String generer(String identifiant) {
        otpRepository.supprimerNonUtilisesParIdentifiant(identifiant);

        String code = String.format("%06d", RANDOM.nextInt(1_000_000));

        Otp otp = Otp.builder()
                .identifiant(identifiant)
                .code(code)
                .expiresAt(LocalDateTime.now().plusMinutes(EXPIRY_MINUTES))
                .build();
        otpRepository.save(otp);

        // TODO production : envoyer via FastMessage (SMS) si identifiant = téléphone
        //                   ou via service email si identifiant = email
        log.info("OTP généré pour {} (valide {} min)", identifiant, EXPIRY_MINUTES);

        return code;
    }

    /**
     * Vérifie le code OTP. Retourne true si valide, false sinon.
     * Marque le code comme utilisé s'il est correct.
     */
    @Transactional
    public boolean verifier(String identifiant, String code) {
        return otpRepository
                .findByIdentifiantAndCodeAndUtiliseFalseAndExpiresAtAfter(
                        identifiant, code, LocalDateTime.now())
                .map(otp -> {
                    otp.setUtilise(true);
                    otpRepository.save(otp);
                    return true;
                })
                .orElse(false);
    }

}
