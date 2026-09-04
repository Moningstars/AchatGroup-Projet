package com.plateformeopportunites.opportunite.dto;

import jakarta.validation.constraints.NotEmpty;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
public class PlanifierParticipantsRequest {
    @NotEmpty
    private List<UUID> participationIds;

    /** null = retirer les participants du planning. */
    private LocalDateTime creneauTraitement;

    private String noteTraitement;
}
