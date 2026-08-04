package com.plateformeopportunites.sondage.entity;

import jakarta.persistence.*;
import lombok.*;
import java.util.UUID;

@Entity
@Table(name = "reponses_detail")
@Getter @Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReponseDetail {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sondage_reponse_id", nullable = false)
    private SondageReponse sondageReponse;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "question_id", nullable = false)
    private Question question;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "option_reponse_id")
    private OptionReponse optionReponse;

    private String valeurTexte;
}
