package com.plateformeopportunites.common.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class StatsResponse {
    private long membresActifs;
    private long achatsGroupes;
    private long sondagesActifs;
}
