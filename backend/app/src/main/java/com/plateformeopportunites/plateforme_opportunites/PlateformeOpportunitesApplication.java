package com.plateformeopportunites.plateforme_opportunites;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.scheduling.annotation.EnableAsync;

@SpringBootApplication(scanBasePackages = "com.plateformeopportunites")
@EnableJpaRepositories(basePackages = "com.plateformeopportunites")
@EntityScan(basePackages = "com.plateformeopportunites")
@EnableAsync
public class PlateformeOpportunitesApplication {

	public static void main(String[] args) {
		SpringApplication.run(PlateformeOpportunitesApplication.class, args);
	}

}
