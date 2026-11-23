package com.crave.repository;

import com.crave.entity.FoodOrder;
import java.util.*;
import org.springframework.data.jpa.repository.JpaRepository;

public interface OrderRepository extends JpaRepository<FoodOrder, Long> {
  List<FoodOrder> findTop100ByCustomerIdOrderByCreatedAtDesc(Long id);

  List<FoodOrder> findTop200ByOrderByCreatedAtDesc();

  Optional<FoodOrder> findByCustomerIdAndRequestKey(Long id, String key);
}
