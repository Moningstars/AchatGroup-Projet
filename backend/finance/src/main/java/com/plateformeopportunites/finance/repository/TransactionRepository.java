package com.plateformeopportunites.finance.repository;

import com.plateformeopportunites.common.enums.StatutTransaction;
import com.plateformeopportunites.common.enums.TypeTransaction;
import com.plateformeopportunites.finance.entity.Transaction;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface TransactionRepository extends JpaRepository<Transaction, UUID> {
    List<Transaction> findByUtilisateurIdOrderByCreatedAtDesc(UUID utilisateurId);
    List<Transaction> findByUtilisateurIdAndType(UUID utilisateurId, TypeTransaction type);
    List<Transaction> findAllByOrderByCreatedAtDesc();
    List<Transaction> findByTypeAndStatutOrderByCreatedAtDesc(TypeTransaction type, StatutTransaction statut);
}
