package com.crave.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.*;

@Entity
@Table(
    name = "food_orders",
    uniqueConstraints =
        @UniqueConstraint(
            name = "uk_order_request",
            columnNames = {"customer_id", "request_key"}))
public class FoodOrder {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "customer_id")
  private AppUser customer;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 30)
  private OrderStatus status = OrderStatus.PLACED;

  @Column(nullable = false, length = 500)
  private String address;

  @Column(nullable = false, length = 20)
  private String phone;

  @Column(nullable = false, length = 300)
  private String notes = "";

  @Column(nullable = false, precision = 10, scale = 2)
  private BigDecimal subtotal;

  @Column(nullable = false, precision = 10, scale = 2)
  private BigDecimal deliveryFee;

  @Column(nullable = false, precision = 10, scale = 2)
  private BigDecimal total;

  @Column(nullable = false)
  private Instant createdAt = Instant.now();

  @Column(nullable = false)
  private Instant updatedAt = Instant.now();

  @Column(nullable = false, length = 80)
  private String requestKey;

  @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, orphanRemoval = true)
  @OrderBy("id ASC")
  private List<OrderItem> items = new ArrayList<>();

  @Version private long version;

  public FoodOrder() {}

  public Long getId() {
    return id;
  }

  public void setId(Long value) {
    this.id = value;
  }

  public AppUser getCustomer() {
    return customer;
  }

  public void setCustomer(AppUser value) {
    this.customer = value;
  }

  public OrderStatus getStatus() {
    return status;
  }

  public void setStatus(OrderStatus value) {
    this.status = value;
  }

  public String getAddress() {
    return address;
  }

  public void setAddress(String value) {
    this.address = value;
  }

  public String getPhone() {
    return phone;
  }

  public void setPhone(String value) {
    this.phone = value;
  }

  public String getNotes() {
    return notes;
  }

  public void setNotes(String value) {
    this.notes = value;
  }

  public BigDecimal getSubtotal() {
    return subtotal;
  }

  public void setSubtotal(BigDecimal value) {
    this.subtotal = value;
  }

  public BigDecimal getDeliveryFee() {
    return deliveryFee;
  }

  public void setDeliveryFee(BigDecimal value) {
    this.deliveryFee = value;
  }

  public BigDecimal getTotal() {
    return total;
  }

  public void setTotal(BigDecimal value) {
    this.total = value;
  }

  public Instant getCreatedAt() {
    return createdAt;
  }

  public void setCreatedAt(Instant value) {
    this.createdAt = value;
  }

  public Instant getUpdatedAt() {
    return updatedAt;
  }

  public void setUpdatedAt(Instant value) {
    this.updatedAt = value;
  }

  public String getRequestKey() {
    return requestKey;
  }

  public void setRequestKey(String value) {
    this.requestKey = value;
  }

  public List<OrderItem> getItems() {
    return items;
  }

  public void setItems(List<OrderItem> value) {
    this.items = value;
  }

  public long getVersion() {
    return version;
  }

  public void setVersion(long value) {
    this.version = value;
  }
}
