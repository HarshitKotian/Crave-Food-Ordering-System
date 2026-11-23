package com.crave.controller;

import com.crave.dto.Api.*;
import com.crave.service.MenuService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/menu")
public class MenuController {
  private final MenuService menu;

  public MenuController(MenuService m) {
    menu = m;
  }

  @GetMapping
  List<MenuView> all() {
    return menu.all();
  }

  @PostMapping
  @PreAuthorize("hasRole('ADMIN')")
  @ResponseStatus(HttpStatus.CREATED)
  MenuView create(@Valid @RequestBody MenuInput p) {
    return menu.save(null, p);
  }

  @PutMapping("/{id}")
  @PreAuthorize("hasRole('ADMIN')")
  MenuView update(@PathVariable Long id, @Valid @RequestBody MenuInput p) {
    return menu.save(id, p);
  }

  @DeleteMapping("/{id}")
  @PreAuthorize("hasRole('ADMIN')")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  void remove(@PathVariable Long id) {
    menu.remove(id);
  }
}
