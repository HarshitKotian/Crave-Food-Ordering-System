package com.crave.service;

import com.crave.dto.Api.*;
import com.crave.entity.*;
import com.crave.exception.ApiException;
import com.crave.repository.UserRepository;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class UserService {
  private final UserRepository users;
  private final PasswordEncoder passwords;

  public UserService(UserRepository u, PasswordEncoder p) {
    users = u;
    passwords = p;
  }

  public AppUser require(Long id) {
    return users
        .findById(id)
        .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "Please sign in again."));
  }

  public AppUser register(Register r) {
    if (r.password().getBytes(java.nio.charset.StandardCharsets.UTF_8).length > 72)
      throw ApiException.bad("Password must be at most 72 UTF-8 bytes.");
    String email = r.email().strip().toLowerCase(Locale.ROOT);
    if (users.findByEmail(email).isPresent())
      throw new ApiException(HttpStatus.CONFLICT, "This email is already registered.");
    AppUser u = new AppUser();
    u.setName(r.name().strip());
    u.setEmail(email);
    u.setPasswordHash(passwords.encode(r.password()));
    return users.save(u);
  }

  public AppUser login(Login r) {
    AppUser u = users.findByEmail(r.email().strip().toLowerCase(Locale.ROOT)).orElse(null);
    if (u == null
        || u.getPasswordHash() == null
        || r.password().getBytes(java.nio.charset.StandardCharsets.UTF_8).length > 72
        || !passwords.matches(r.password(), u.getPasswordHash()))
      throw new ApiException(HttpStatus.UNAUTHORIZED, "Email or password is incorrect.");
    return u;
  }

  public UserView profile(Long id, Profile p) {
    AppUser u = require(id);
    u.setName(p.name().strip());
    u.setPhone(p.phone() == null ? "" : p.phone());
    return UserView.of(u);
  }

  public List<UserView> all() {
    return users.findAll().stream().map(UserView::of).toList();
  }

  public UserView role(Long actor, Long id, Role role) {
    if (actor.equals(id)) throw ApiException.bad("You cannot change your own role.");
    AppUser u = require(id);
    u.setRole(role);
    return UserView.of(u);
  }

  public AppUser google(String subject, String email, String name) {
    return users
        .findByGoogleSubject(subject)
        .orElseGet(
            () -> {
              String normalized = email.toLowerCase(Locale.ROOT);
              if (users.findByEmail(normalized).isPresent())
                throw ApiException.bad(
                    "This email already uses password login. Sign in with your password.");
              AppUser u = new AppUser();
              u.setEmail(normalized);
              u.setName(name == null ? "Customer" : name.substring(0, Math.min(80, name.length())));
              u.setGoogleSubject(subject);
              return users.save(u);
            });
  }
}
