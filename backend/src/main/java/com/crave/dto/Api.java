package com.crave.dto;

import com.crave.entity.*;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public final class Api {
  private Api() {}

  public record Register(
      @NotBlank @Size(max = 80) String name,
      @NotBlank @Email @Size(max = 160) String email,
      @NotBlank @Size(min = 8, max = 72) String password) {}

  public record Login(@NotBlank @Email String email, @NotBlank String password) {}

  public record UserView(Long id, String name, String email, Role role, String phone) {
    public static UserView of(AppUser u) {
      return new UserView(u.getId(), u.getName(), u.getEmail(), u.getRole(), u.getPhone());
    }
  }

  public record AuthResponse(String token, UserView user) {}

  public record Profile(
      @NotBlank @Size(max = 80) String name,
      @Pattern(regexp = "^$|[0-9+ ()-]{8,20}") String phone) {}

  public record MenuInput(
      @NotBlank @Size(max = 100) String name,
      @NotBlank @Size(max = 400) String description,
      @NotBlank @Pattern(regexp = "Pizza|Burgers|Indian|Sides|Desserts|Drinks") String category,
      @NotNull @DecimalMin("1.00") @DecimalMax("99999.00") @Digits(integer = 5, fraction = 2)
          BigDecimal price,
      boolean vegetarian,
      boolean available,
      @NotBlank @Size(max = 20) String symbol) {}

  public record MenuView(
      Long id,
      String name,
      String description,
      String category,
      BigDecimal price,
      boolean vegetarian,
      boolean available,
      String symbol) {
    public static MenuView of(MenuItem m) {
      return new MenuView(
          m.getId(),
          m.getName(),
          m.getDescription(),
          m.getCategory(),
          m.getPrice(),
          m.getVegetarian(),
          m.getAvailable(),
          m.getSymbol());
    }
  }

  public record CartLine(@NotNull @Positive Long menuItemId, @Min(1) @Max(20) int quantity) {}

  public record Checkout(
      @NotEmpty @Size(max = 30) List<@Valid CartLine> items,
      @NotBlank @Size(min = 10, max = 500) String address,
      @NotBlank @Pattern(regexp = "[0-9+ ()-]{8,20}") String phone,
      @Size(max = 300) String notes) {}

  public record LineView(Long menuItemId, String name, BigDecimal unitPrice, int quantity) {}

  public record OrderView(
      Long id,
      OrderStatus status,
      String customerName,
      String address,
      String phone,
      String notes,
      BigDecimal subtotal,
      BigDecimal deliveryFee,
      BigDecimal total,
      Instant createdAt,
      List<LineView> items) {
    public static OrderView of(FoodOrder o) {
      return new OrderView(
          o.getId(),
          o.getStatus(),
          o.getCustomer().getName(),
          o.getAddress(),
          o.getPhone(),
          o.getNotes(),
          o.getSubtotal(),
          o.getDeliveryFee(),
          o.getTotal(),
          o.getCreatedAt(),
          o.getItems().stream()
              .map(
                  i ->
                      new LineView(
                          i.getMenuItemId(), i.getName(), i.getUnitPrice(), i.getQuantity()))
              .toList());
    }
  }

  public record StatusInput(@NotNull OrderStatus status) {}

  public record RoleInput(@NotNull Role role) {}

  public record CodeInput(@NotBlank String code) {}
}
