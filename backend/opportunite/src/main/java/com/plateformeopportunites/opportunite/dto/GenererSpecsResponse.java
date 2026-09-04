package com.plateformeopportunites.opportunite.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class GenererSpecsResponse {
    private List<String> pointsForts;
    private String casUsage;
    private String finePrint;
}
