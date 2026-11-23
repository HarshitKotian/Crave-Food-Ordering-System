package com.crave.service;

import com.crave.dto.Api.*;
import com.crave.entity.*;
import com.crave.exception.ApiException;
import com.crave.repository.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class OrderService {
  private final OrderRepository orders;
  private final MenuRepository menu;
  private final UserService users;

  public OrderService(OrderRepository o, MenuRepository m, UserService u) {
    orders = o;
    menu = m;
    users = u;
  }

  public OrderView place(Long userId, String key, Checkout p) {
    if (key == null || !key.matches("[a-zA-Z0-9_-]{8,80}"))
      throw ApiException.bad("A valid Idempotency-Key header is required.");
    var existing = orders.findByCustomerIdAndRequestKey(userId, key);
    if (existing.isPresent()) return OrderView.of(existing.get());
    AppUser u = users.require(userId);
    if (u.getRole() != Role.CUSTOMER)
      throw new ApiException(HttpStatus.FORBIDDEN, "Only customers can place orders.");
    FoodOrder order = new FoodOrder();
    order.setCustomer(u);
    order.setAddress(p.address().strip());
    order.setPhone(p.phone());
    order.setNotes(p.notes() == null ? "" : p.notes().strip());
    order.setRequestKey(key);
    BigDecimal subtotal = BigDecimal.ZERO;
    Set<Long> seen = new HashSet<>();
    for (CartLine line : p.items()) {
      if (!seen.add(line.menuItemId()))
        throw ApiException.bad("Each menu item may appear only once.");
      MenuItem item =
          menu.findById(line.menuItemId())
              .orElseThrow(() -> ApiException.bad("An item is no longer on the menu."));
      if (!item.getAvailable())
        throw ApiException.bad(item.getName() + " is currently unavailable.");
      OrderItem snapshot = new OrderItem();
      snapshot.setOrder(order);
      snapshot.setMenuItemId(item.getId());
      snapshot.setName(item.getName());
      snapshot.setUnitPrice(item.getPrice());
      snapshot.setQuantity(line.quantity());
      order.getItems().add(snapshot);
      subtotal = subtotal.add(item.getPrice().multiply(BigDecimal.valueOf(line.quantity())));
    }
    order.setSubtotal(subtotal);
    order.setDeliveryFee(
        subtotal.compareTo(new BigDecimal("499")) >= 0 ? BigDecimal.ZERO : new BigDecimal("35.00"));
    order.setTotal(subtotal.add(order.getDeliveryFee()));
    return OrderView.of(orders.saveAndFlush(order));
  }

  public List<OrderView> mine(Long id) {
    return orders.findTop100ByCustomerIdOrderByCreatedAtDesc(id).stream()
        .map(OrderView::of)
        .toList();
  }

  public List<OrderView> all() {
    return orders.findTop200ByOrderByCreatedAtDesc().stream().map(OrderView::of).toList();
  }

  private FoodOrder get(Long id) {
    return orders.findById(id).orElseThrow(() -> ApiException.missing("Order not found."));
  }

  public OrderView detail(Long id, Long actor) {
    FoodOrder o = get(id);
    Role role = users.require(actor).getRole();
    if (!o.getCustomer().getId().equals(actor) && role == Role.CUSTOMER)
      throw ApiException.missing("Order not found.");
    return OrderView.of(o);
  }

  public OrderView cancel(Long id, Long actor) {
    FoodOrder o = get(id);
    if (!o.getCustomer().getId().equals(actor)) throw ApiException.missing("Order not found.");
    if (o.getStatus() != OrderStatus.PLACED)
      throw ApiException.bad("Only newly placed orders can be cancelled.");
    o.setStatus(OrderStatus.CANCELLED);
    o.setUpdatedAt(Instant.now());
    return OrderView.of(o);
  }

  public OrderView status(Long id, OrderStatus next) {
    FoodOrder o = get(id);
    OrderStatus current = o.getStatus();
    boolean valid =
        switch (current) {
          case PLACED -> next == OrderStatus.CONFIRMED || next == OrderStatus.CANCELLED;
          case CONFIRMED -> next == OrderStatus.PREPARING || next == OrderStatus.CANCELLED;
          case PREPARING -> next == OrderStatus.OUT_FOR_DELIVERY;
          case OUT_FOR_DELIVERY -> next == OrderStatus.DELIVERED;
          default -> false;
        };
    if (!valid) throw ApiException.bad("This order status transition is not allowed.");
    o.setStatus(next);
    o.setUpdatedAt(Instant.now());
    return OrderView.of(o);
  }
}
