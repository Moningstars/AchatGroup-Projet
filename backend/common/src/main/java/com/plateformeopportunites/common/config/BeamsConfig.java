package com.plateformeopportunites.common.config;

import com.pusher.pushnotifications.PushNotifications;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class BeamsConfig {

    @Value("${beams.instance-id}")
    private String instanceId;

    @Value("${beams.secret-key}")
    private String secretKey;

    @Bean
    public PushNotifications pushNotifications() {
        return new PushNotifications(instanceId, secretKey);
    }
}
