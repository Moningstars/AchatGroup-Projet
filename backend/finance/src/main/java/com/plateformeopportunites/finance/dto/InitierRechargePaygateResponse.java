package com.plateformeopportunites.finance.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class InitierRechargePaygateResponse {
    private String identifier;
    private String txReference;
    private int paygateStatus;
    private String message;
}
