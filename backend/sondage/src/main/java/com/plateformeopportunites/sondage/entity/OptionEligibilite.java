package com.plateformeopportunites.sondage.entity;

import jakarta.persistence.*;
import lombok.*;
import java.util.UUID;

@Entity
@Table(name = "options_eligibilite")
@Getter @Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OptionEligibilite {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "question_eligibilite_id", nullable = false)
    private QuestionEligibilite questionEligibilite;

    @Column(nullable = false)
    private String libelle;

    @Column(nullable = false)
    private Boolean estCorrecte;

    @Column(nullable = false)
    private Integer ordre;
}
