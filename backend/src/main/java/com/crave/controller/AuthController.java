package com.crave.controller;

import com.crave.dto.Api.*;
import com.crave.security.*;
import com.crave.service.UserService;
import jakarta.validation.Valid;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
public class AuthController {
  private final UserService users;
  private final TokenService tokens;
  private final OAuthCodes codes;
  private final boolean google;

  public AuthController(
      UserService u, TokenService t, OAuthCodes c, @Value("${app.google-enabled}") boolean g) {
    users = u;
    tokens = t;
    codes = c;
    google = g;
  }

  @GetMapping("/health")
  Map<String, String> health() {
    return Map.of("status", "UP");
  }

  @GetMapping("/auth/config")
  Map<String, Boolean> config() {
    return Map.of("googleEnabled", google);
  }

  @PostMapping("/auth/register")
  @ResponseStatus(HttpStatus.CREATED)
  AuthResponse register(@Valid @RequestBody Register p) {
    return tokens.issue(users.register(p));
  }

  @PostMapping("/auth/login")
  AuthResponse login(@Valid @RequestBody Login p) {
    return tokens.issue(users.login(p));
  }

  @PostMapping("/auth/google/exchange")
  AuthResponse exchange(@Valid @RequestBody CodeInput p) {
    return tokens.issue(users.require(codes.consume(p.code())));
  }

  @GetMapping("/auth/me")
  UserView me(@AuthenticationPrincipal Jwt jwt) {
    return UserView.of(users.require(Long.valueOf(jwt.getSubject())));
  }

  @PutMapping("/auth/me")
  UserView update(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody Profile p) {
    return users.profile(Long.valueOf(jwt.getSubject()), p);
  }
}
