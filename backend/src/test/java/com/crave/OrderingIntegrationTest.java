package com.crave;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.crave.entity.*;
import com.crave.repository.*;
import com.fasterxml.jackson.databind.*;
import java.math.BigDecimal;
import java.util.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("demo")
class OrderingIntegrationTest {
  @Autowired MockMvc mvc;
  @Autowired ObjectMapper json;
  @Autowired MenuRepository menu;
  @Autowired UserRepository users;

  private String token(String email) throws Exception {
    var result =
        mvc.perform(
                post("/api/auth/login")
                    .contentType("application/json")
                    .content(
                        json.writeValueAsString(Map.of("email", email, "password", "Demo@12345"))))
            .andExpect(status().isOk())
            .andReturn();
    return json.readTree(result.getResponse().getContentAsString()).get("token").asText();
  }

  private String register() throws Exception {
    var result =
        mvc.perform(
                post("/api/auth/register")
                    .contentType("application/json")
                    .content(
                        json.writeValueAsString(
                            Map.of(
                                "name",
                                "Test Customer",
                                "email",
                                UUID.randomUUID() + "@test.com",
                                "password",
                                "Test@12345"))))
            .andExpect(status().isCreated())
            .andReturn();
    return json.readTree(result.getResponse().getContentAsString()).get("token").asText();
  }

  private String checkout(long id, int quantity) throws Exception {
    return json.writeValueAsString(
        Map.of(
            "items",
            List.of(Map.of("menuItemId", id, "quantity", quantity)),
            "address",
            "Flat 5, MG Road, Mumbai 400001",
            "phone",
            "9876543210",
            "notes",
            "Less spicy"));
  }

  private JsonNode place(String token, String key, long id, int qty) throws Exception {
    return json.readTree(
        mvc.perform(
                post("/api/orders")
                    .header("Authorization", "Bearer " + token)
                    .header("Idempotency-Key", key)
                    .contentType("application/json")
                    .content(checkout(id, qty)))
            .andExpect(status().isCreated())
            .andReturn()
            .getResponse()
            .getContentAsString());
  }

  @Test
  void menuPublicAndAuthenticationRequired() throws Exception {
    mvc.perform(get("/api/menu"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$[0].name").exists());
    mvc.perform(get("/api/orders")).andExpect(status().isUnauthorized());
    mvc.perform(get("/api/admin/users")).andExpect(status().isUnauthorized());
  }

  @Test
  void registrationCannotChooseRoleAndDoesNotExposePassword() throws Exception {
    String t = register();
    mvc.perform(get("/api/auth/me").header("Authorization", "Bearer " + t))
        .andExpect(jsonPath("$.role").value("CUSTOMER"))
        .andExpect(jsonPath("$.passwordHash").doesNotExist());
    mvc.perform(
            post("/api/auth/register")
                .contentType("application/json")
                .content(
                    "{\"name\":\"Bad\",\"email\":\"bad@test.com\",\"password\":\"Test@12345\",\"role\":\"ADMIN\"}"))
        .andExpect(status().isBadRequest());
  }

  @Test
  void wrongPasswordAndInvalidTokenRejected() throws Exception {
    mvc.perform(
            post("/api/auth/login")
                .contentType("application/json")
                .content("{\"email\":\"customer@crave.test\",\"password\":\"wrong\"}"))
        .andExpect(status().isUnauthorized());
    mvc.perform(get("/api/orders").header("Authorization", "Bearer invalid.token.value"))
        .andExpect(status().isUnauthorized());
  }

  @Test
  void customerCannotManageMenuUsersOrStaffOrders() throws Exception {
    String t = register();
    mvc.perform(get("/api/staff/orders").header("Authorization", "Bearer " + t))
        .andExpect(status().isForbidden());
    mvc.perform(get("/api/admin/users").header("Authorization", "Bearer " + t))
        .andExpect(status().isForbidden());
    mvc.perform(delete("/api/menu/1").header("Authorization", "Bearer " + t))
        .andExpect(status().isForbidden());
  }

  @Test
  void checkoutUsesServerPricesAndSameKeyDoesNotDuplicate() throws Exception {
    String t = register();
    MenuItem m = menu.findAllByOrderByIdAsc().getFirst();
    String key = UUID.randomUUID().toString();
    JsonNode o = place(t, key, m.getId(), 1), again = place(t, key, m.getId(), 1);
    assertEquals(o.get("id"), again.get("id"));
    assertEquals(0, m.getPrice().compareTo(o.get("subtotal").decimalValue()));
    assertEquals(
        0, m.getPrice().add(new BigDecimal("35")).compareTo(o.get("total").decimalValue()));
    mvc.perform(
            post("/api/orders")
                .header("Authorization", "Bearer " + t)
                .header("Idempotency-Key", UUID.randomUUID().toString())
                .contentType("application/json")
                .content(checkout(m.getId(), 1).replace("\"notes\":", "\"total\":1,\"notes\":")))
        .andExpect(status().isBadRequest());
  }

  @Test
  void largeOrdersHaveFreeDelivery() throws Exception {
    MenuItem m = menu.findAllByOrderByIdAsc().getFirst();
    JsonNode o = place(register(), UUID.randomUUID().toString(), m.getId(), 3);
    assertEquals(0, BigDecimal.ZERO.compareTo(o.get("deliveryFee").decimalValue()));
    assertEquals(o.get("subtotal"), o.get("total"));
  }

  @Test
  void customersCannotReadOrCancelOtherCustomersOrders() throws Exception {
    MenuItem m = menu.findAllByOrderByIdAsc().getFirst();
    long id = place(register(), UUID.randomUUID().toString(), m.getId(), 1).get("id").asLong();
    String other = register();
    mvc.perform(get("/api/orders/" + id).header("Authorization", "Bearer " + other))
        .andExpect(status().isNotFound());
    mvc.perform(post("/api/orders/" + id + "/cancel").header("Authorization", "Bearer " + other))
        .andExpect(status().isNotFound());
  }

  @Test
  void invalidQuantityMissingKeyAndUnavailableItemsRejected() throws Exception {
    String t = register();
    MenuItem m = menu.findAllByOrderByIdAsc().getFirst();
    mvc.perform(
            post("/api/orders")
                .header("Authorization", "Bearer " + t)
                .header("Idempotency-Key", UUID.randomUUID().toString())
                .contentType("application/json")
                .content(checkout(m.getId(), 0)))
        .andExpect(status().isBadRequest());
    mvc.perform(
            post("/api/orders")
                .header("Authorization", "Bearer " + t)
                .contentType("application/json")
                .content(checkout(m.getId(), 1)))
        .andExpect(status().isBadRequest());
    m.setAvailable(false);
    menu.saveAndFlush(m);
    try {
      mvc.perform(
              post("/api/orders")
                  .header("Authorization", "Bearer " + t)
                  .header("Idempotency-Key", UUID.randomUUID().toString())
                  .contentType("application/json")
                  .content(checkout(m.getId(), 1)))
          .andExpect(status().isBadRequest());
    } finally {
      m = menu.findById(m.getId()).orElseThrow();
      m.setAvailable(true);
      menu.saveAndFlush(m);
    }
  }

  @Test
  void staffMustFollowStatusTransitionsAndCustomersCannotCancelConfirmedOrder() throws Exception {
    MenuItem m = menu.findAllByOrderByIdAsc().getFirst();
    String c = register(), s = token("staff@crave.test");
    long id = place(c, UUID.randomUUID().toString(), m.getId(), 1).get("id").asLong();
    mvc.perform(
            patch("/api/staff/orders/" + id + "/status")
                .header("Authorization", "Bearer " + s)
                .contentType("application/json")
                .content("{\"status\":\"DELIVERED\"}"))
        .andExpect(status().isBadRequest());
    for (String status : List.of("CONFIRMED", "PREPARING", "OUT_FOR_DELIVERY", "DELIVERED")) {
      mvc.perform(
              patch("/api/staff/orders/" + id + "/status")
                  .header("Authorization", "Bearer " + s)
                  .contentType("application/json")
                  .content("{\"status\":\"" + status + "\"}"))
          .andExpect(status().isOk())
          .andExpect(jsonPath("$.status").value(status));
    }
    mvc.perform(post("/api/orders/" + id + "/cancel").header("Authorization", "Bearer " + c))
        .andExpect(status().isBadRequest());
  }

  @Test
  void newlyPlacedOrderCanBeCancelled() throws Exception {
    MenuItem m = menu.findAllByOrderByIdAsc().getFirst();
    String c = register();
    long id = place(c, UUID.randomUUID().toString(), m.getId(), 1).get("id").asLong();
    mvc.perform(post("/api/orders/" + id + "/cancel").header("Authorization", "Bearer " + c))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status").value("CANCELLED"));
  }

  @Test
  void adminCanCreateAndDeleteMenuAndStaffCannot() throws Exception {
    String body =
        "{\"name\":\"Test dish\",\"description\":\"Fresh test"
            + " dish\",\"category\":\"Sides\",\"price\":99,\"vegetarian\":true,\"available\":true,\"symbol\":\"🍟\"}";
    String admin = token("admin@crave.test"), staff = token("staff@crave.test");
    mvc.perform(
            post("/api/menu")
                .header("Authorization", "Bearer " + staff)
                .contentType("application/json")
                .content(body))
        .andExpect(status().isForbidden());
    JsonNode created =
        json.readTree(
            mvc.perform(
                    post("/api/menu")
                        .header("Authorization", "Bearer " + admin)
                        .contentType("application/json")
                        .content(body))
                .andExpect(status().isCreated())
                .andReturn()
                .getResponse()
                .getContentAsString());
    mvc.perform(
            delete("/api/menu/" + created.get("id").asLong())
                .header("Authorization", "Bearer " + admin))
        .andExpect(status().isNoContent());
  }

  @Test
  void roleChangeTakesEffectOnExistingJwt() throws Exception {
    String customer = register(), admin = token("admin@crave.test");
    Long id =
        Long.valueOf(
            json.readTree(
                    mvc.perform(get("/api/auth/me").header("Authorization", "Bearer " + customer))
                        .andReturn()
                        .getResponse()
                        .getContentAsString())
                .get("id")
                .asText());
    mvc.perform(
            patch("/api/admin/users/" + id + "/role")
                .header("Authorization", "Bearer " + admin)
                .contentType("application/json")
                .content("{\"role\":\"STAFF\"}"))
        .andExpect(status().isOk());
    mvc.perform(get("/api/staff/orders").header("Authorization", "Bearer " + customer))
        .andExpect(status().isOk());
  }
}
