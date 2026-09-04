package com.plateformeopportunites.sondage.entity;

import jakarta.persistence.*;
import lombok.*;
import java.util.UUID;

@Entity
@Table(name = "options_reponse")
@Getter @Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OptionReponse {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "question_id", nullable = false)
    private Question question;

    @Column(nullable = false)
    private String libelle;

    @Column(nullable = false)
    private Integer ordre;
}
