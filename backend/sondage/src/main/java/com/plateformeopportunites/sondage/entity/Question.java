package com.plateformeopportunites.sondage.entity;

import com.plateformeopportunites.common.enums.TypeQuestion;
import jakarta.persistence.*;
import lombok.*;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "questions")
@Getter @Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Question {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sondage_id", nullable = false)
    private Sondage sondage;

    @Column(nullable = false)
    private Integer ordre;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TypeQuestion typeQuestion;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String texte;

    @Column(nullable = false)
    private Boolean obligatoire;

    @OneToMany(mappedBy = "question", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<OptionReponse> options;
}
