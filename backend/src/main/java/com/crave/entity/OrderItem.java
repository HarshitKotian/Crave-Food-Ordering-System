package com.crave.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.util.*;

@Entity
@Table(name = "order_items")
public class OrderItem {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "order_id")
  private FoodOrder order;

  @Column(nullable = false)
  private Long menuItemId;

  @Column(nullable = false, length = 100)
  private String name;

  @Column(nullable = false, precision = 10, scale = 2)
  private BigDecimal unitPrice;

  @Column(nullable = false)
  private int quantity;

  public OrderItem() {}

  public Long getId() {
    return id;
  }

  public void setId(Long value) {
    this.id = value;
  }

  public FoodOrder getOrder() {
    return order;
  }

  public void setOrder(FoodOrder value) {
    this.order = value;
  }

  public Long getMenuItemId() {
    return menuItemId;
  }

  public void setMenuItemId(Long value) {
    this.menuItemId = value;
  }

  public String getName() {
    return name;
  }

  public void setName(String value) {
    this.name = value;
  }

  public BigDecimal getUnitPrice() {
    return unitPrice;
  }

  public void setUnitPrice(BigDecimal value) {
    this.unitPrice = value;
  }

  public int getQuantity() {
    return quantity;
  }

  public void setQuantity(int value) {
    this.quantity = value;
  }
}
