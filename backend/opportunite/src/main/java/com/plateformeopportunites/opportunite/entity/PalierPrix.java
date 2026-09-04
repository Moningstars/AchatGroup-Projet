package com.plateformeopportunites.opportunite.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.util.UUID;

@Entity
@Table(name = "paliers_prix")
@Getter @Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PalierPrix {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "opportunite_id", nullable = false)
    private Opportunite opportunite;

    @Column(nullable = false)
    private Integer seuilMin;

    @Column(nullable = false)
    private Integer seuilMax;

    @Column(nullable = false)
    private BigDecimal prix;
}
