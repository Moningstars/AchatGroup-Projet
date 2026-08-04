package com.plateformeopportunites.finance.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;
import java.math.BigDecimal;

@Data
public class PaygateWebhookPayload {

    @JsonProperty("tx_reference")
    private String txReference;

    private String identifier;

    @JsonProperty("payment_reference")
    private String paymentReference;

    private BigDecimal amount;

    private String datetime;

    @JsonProperty("payment_method")
    private String paymentMethod;

    @JsonProperty("phone_number")
    private String phoneNumber;
}
