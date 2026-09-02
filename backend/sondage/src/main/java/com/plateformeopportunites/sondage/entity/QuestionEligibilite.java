package com.plateformeopportunites.sondage.entity;

import com.plateformeopportunites.common.enums.TypeQuestion;
import jakarta.persistence.*;
import lombok.*;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "questions_eligibilite")
@Getter @Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class QuestionEligibilite {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sondage_eligibilite_id", nullable = false)
    private SondageEligibilite sondageEligibilite;

    @Column(nullable = false)
    private Integer ordre;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String texte;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TypeQuestion typeQuestion;

    private String reponseAttendue;

    @Column(nullable = false)
    private Boolean obligatoire;

    @OneToMany(mappedBy = "questionEligibilite", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<OptionEligibilite> options;
}
