package com.crave.controller;

import com.crave.dto.Api.*;
import com.crave.service.OrderService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
public class OrderController {
  private final OrderService orders;

  public OrderController(OrderService o) {
    orders = o;
  }

  @PostMapping("/orders")
  @ResponseStatus(HttpStatus.CREATED)
  @PreAuthorize("hasRole('CUSTOMER')")
  OrderView place(
      @AuthenticationPrincipal Jwt jwt,
      @RequestHeader(value = "Idempotency-Key", required = false) String key,
      @Valid @RequestBody Checkout p) {
    return orders.place(Long.valueOf(jwt.getSubject()), key, p);
  }

  @GetMapping("/orders")
  List<OrderView> mine(@AuthenticationPrincipal Jwt jwt) {
    return orders.mine(Long.valueOf(jwt.getSubject()));
  }

  @GetMapping("/orders/{id}")
  OrderView detail(@AuthenticationPrincipal Jwt jwt, @PathVariable Long id) {
    return orders.detail(id, Long.valueOf(jwt.getSubject()));
  }

  @PostMapping("/orders/{id}/cancel")
  OrderView cancel(@AuthenticationPrincipal Jwt jwt, @PathVariable Long id) {
    return orders.cancel(id, Long.valueOf(jwt.getSubject()));
  }

  @GetMapping("/staff/orders")
  @PreAuthorize("hasAnyRole('STAFF','ADMIN')")
  List<OrderView> all() {
    return orders.all();
  }

  @PatchMapping("/staff/orders/{id}/status")
  @PreAuthorize("hasAnyRole('STAFF','ADMIN')")
  OrderView status(@PathVariable Long id, @Valid @RequestBody StatusInput p) {
    return orders.status(id, p.status());
  }
}
