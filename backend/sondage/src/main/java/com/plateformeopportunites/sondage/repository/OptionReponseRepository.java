package com.plateformeopportunites.sondage.repository;

import com.plateformeopportunites.sondage.entity.OptionReponse;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface OptionReponseRepository extends JpaRepository<OptionReponse, UUID> {
}
