package com.crave.service;

import com.crave.dto.Api.*;
import com.crave.entity.MenuItem;
import com.crave.exception.ApiException;
import com.crave.repository.MenuRepository;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class MenuService {
  private final MenuRepository menu;

  public MenuService(MenuRepository m) {
    menu = m;
  }

  public List<MenuView> all() {
    return menu.findAllByOrderByIdAsc().stream().map(MenuView::of).toList();
  }

  public MenuView save(Long id, MenuInput p) {
    MenuItem m =
        id == null
            ? new MenuItem()
            : menu.findById(id).orElseThrow(() -> ApiException.missing("Menu item not found."));
    m.setName(p.name().strip());
    m.setDescription(p.description().strip());
    m.setCategory(p.category());
    m.setPrice(p.price());
    m.setVegetarian(p.vegetarian());
    m.setAvailable(p.available());
    m.setSymbol(p.symbol());
    return MenuView.of(menu.save(m));
  }

  public void remove(Long id) {
    MenuItem m = menu.findById(id).orElseThrow(() -> ApiException.missing("Menu item not found."));
    menu.delete(m);
  }
}
