package com.plateformeopportunites.opportunite.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "souscriptions_idempotence")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class SouscriptionIdempotence {
    @Id
    @Column(name = "request_id", nullable = false, updatable = false)
    private UUID requestId;
    @Column(name = "utilisateur_id", nullable = false, updatable = false)
    private UUID utilisateurId;
    @Column(name = "opportunite_id", nullable = false, updatable = false)
    private UUID opportuniteId;
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
    @PrePersist
    void onCreate() { if (createdAt == null) createdAt = LocalDateTime.now(); }
}