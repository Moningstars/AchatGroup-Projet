package com.plateformeopportunites.opportunite.repository;

import com.plateformeopportunites.opportunite.entity.TentativeSouscription;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface TentativeSouscriptionRepository extends JpaRepository<TentativeSouscription, UUID> {
    List<TentativeSouscription> findTop100ByOrderByCreatedAtDesc();
}
