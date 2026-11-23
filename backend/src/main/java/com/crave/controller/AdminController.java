package com.crave.controller;

import com.crave.dto.Api.*;
import com.crave.service.UserService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/users")
@PreAuthorize("hasRole('ADMIN')")
public class AdminController {
  private final UserService users;

  public AdminController(UserService u) {
    users = u;
  }

  @GetMapping
  List<UserView> all() {
    return users.all();
  }

  @PatchMapping("/{id}/role")
  UserView role(
      @AuthenticationPrincipal Jwt jwt, @PathVariable Long id, @Valid @RequestBody RoleInput p) {
    return users.role(Long.valueOf(jwt.getSubject()), id, p.role());
  }
}
