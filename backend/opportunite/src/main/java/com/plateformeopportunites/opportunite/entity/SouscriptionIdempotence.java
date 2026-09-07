package com.plateformeopportunites.opportunite.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "souscriptions_idempotence")
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
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
}
