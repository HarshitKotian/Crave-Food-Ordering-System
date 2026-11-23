package com.crave.repository;

import com.crave.entity.MenuItem;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MenuRepository extends JpaRepository<MenuItem, Long> {
  List<MenuItem> findAllByOrderByIdAsc();
}
