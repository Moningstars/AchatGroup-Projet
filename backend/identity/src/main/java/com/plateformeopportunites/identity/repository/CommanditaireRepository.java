package com.plateformeopportunites.identity.repository;

import com.plateformeopportunites.identity.entity.Commanditaire;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import jakarta.persistence.LockModeType;
import java.util.Optional;
import java.util.UUID;

public interface CommanditaireRepository extends JpaRepository<Commanditaire, UUID> {
    Optional<Commanditaire> findByEmail(String email);
    boolean existsByEmail(String email);
    boolean existsByEmailIgnoreCase(String email);
    boolean existsByTelephone(String telephone);
    boolean existsByEmailIgnoreCaseAndIdNot(String email, UUID id);
    boolean existsByTelephoneAndIdNot(String telephone, UUID id);
    Optional<Commanditaire> findByEmailIgnoreCase(String email);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<Commanditaire> findWithLockById(UUID id);
}
