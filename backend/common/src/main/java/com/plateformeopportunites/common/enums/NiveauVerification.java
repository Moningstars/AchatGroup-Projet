package com.plateformeopportunites.common.enums;

public enum NiveauVerification {
    AUCUN,       // inscrit par téléphone, pas encore de demande KYC
    EN_ATTENTE,  // a soumis ses informations, en attente d'approbation admin
    VERIFIE,     // identité validée par l'admin → peut effectuer des retraits
    REJETE       // demande KYC rejetée par l'admin
}