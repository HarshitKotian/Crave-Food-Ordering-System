package com.crave.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.util.*;

@Entity
@Table(name = "menu_items")
public class MenuItem {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(nullable = false, length = 100)
  private String name;

  @Column(nullable = false, length = 400)
  private String description;

  @Column(nullable = false, length = 40)
  private String category;

  @Column(nullable = false, precision = 10, scale = 2)
  private BigDecimal price;

  @Column(nullable = false)
  private boolean vegetarian = true;

  @Column(nullable = false)
  private boolean available = true;

  @Column(nullable = false, length = 20)
  private String symbol = "🍽️";

  @Version private long version;

  public MenuItem() {}

  public Long getId() {
    return id;
  }

  public void setId(Long value) {
    this.id = value;
  }

  public String getName() {
    return name;
  }

  public void setName(String value) {
    this.name = value;
  }

  public String getDescription() {
    return description;
  }

  public void setDescription(String value) {
    this.description = value;
  }

  public String getCategory() {
    return category;
  }

  public void setCategory(String value) {
    this.category = value;
  }

  public BigDecimal getPrice() {
    return price;
  }

  public void setPrice(BigDecimal value) {
    this.price = value;
  }

  public boolean getVegetarian() {
    return vegetarian;
  }

  public void setVegetarian(boolean value) {
    this.vegetarian = value;
  }

  public boolean getAvailable() {
    return available;
  }

  public void setAvailable(boolean value) {
    this.available = value;
  }

  public String getSymbol() {
    return symbol;
  }

  public void setSymbol(String value) {
    this.symbol = value;
  }

  public long getVersion() {
    return version;
  }

  public void setVersion(long value) {
    this.version = value;
  }
}
