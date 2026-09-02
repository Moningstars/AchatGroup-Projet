package com.plateformeopportunites.sondage.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "sondages_eligibilite")
@Getter @Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SondageEligibilite {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sondage_id", nullable = false, unique = true)
    private Sondage sondage;

    @Column(nullable = false)
    private String titre;

    @Column(nullable = false)
    private Integer nombreQuestions;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @OneToMany(mappedBy = "sondageEligibilite", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<QuestionEligibilite> questions;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }
}
