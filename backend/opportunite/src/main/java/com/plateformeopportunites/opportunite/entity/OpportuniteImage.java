package com.plateformeopportunites.opportunite.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "opportunite_images")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class OpportuniteImage {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "opportunite_id", nullable = false)
    private Opportunite opportunite;

    @Column(nullable = false)
    private String url;

    @Column
    private String legende;

    @Column(nullable = false)
    private Integer ordre;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        if (this.ordre == null) this.ordre = 0;
    }
}
