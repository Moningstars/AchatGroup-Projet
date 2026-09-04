package com.plateformeopportunites.opportunite.entity;

import com.plateformeopportunites.identity.entity.Utilisateur;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "tentatives_souscription")
@Getter @Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TentativeSouscription {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "opportunite_id", nullable = false)
    private Opportunite opportunite;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "utilisateur_id", nullable = false)
    private Utilisateur utilisateur;

    @Column(nullable = false)
    private Integer quantite;

    @Column(precision = 19, scale = 2)
    private BigDecimal montantTransaction;

    @Column(nullable = false, length = 40)
    private String motif;

    @Column(nullable = false, length = 500)
    private String detail;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    void onCreate() {
        if (createdAt == null) createdAt = LocalDateTime.now();
    }
}
