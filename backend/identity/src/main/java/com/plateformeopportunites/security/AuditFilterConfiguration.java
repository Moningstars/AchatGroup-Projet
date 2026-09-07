package com.plateformeopportunites.security;

import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class AuditFilterConfiguration {

    @Bean
    public FilterRegistrationBean<AuditHttpFilter> disableAuditFilterAutoRegistration(AuditHttpFilter filter) {
        FilterRegistrationBean<AuditHttpFilter> registration = new FilterRegistrationBean<>(filter);
        registration.setEnabled(false);
        return registration;
    }
}
