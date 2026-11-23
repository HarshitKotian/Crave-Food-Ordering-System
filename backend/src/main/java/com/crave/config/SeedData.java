package com.crave.config;

import com.crave.dto.Api.*;
import com.crave.entity.*;
import com.crave.repository.*;
import com.crave.service.MenuService;
import java.math.BigDecimal;
import java.util.Arrays;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;
import org.springframework.security.crypto.password.PasswordEncoder;

@Configuration
public class SeedData {
  @Bean
  CommandLineRunner seed(
      MenuRepository menu,
      MenuService service,
      UserRepository users,
      PasswordEncoder encoder,
      Environment env,
      @Value("${app.admin-email}") String adminEmail,
      @Value("${app.admin-password}") String adminPassword) {
    return args -> {
      if (menu.count() == 0) {
        String[][] rows = {
          {
            "Margherita Pizza",
            "Slow-simmered tomato, fresh mozzarella and basil.",
            "Pizza",
            "249",
            "true",
            "🍕"
          },
          {
            "Smoky Paneer Burger",
            "Grilled paneer, crunchy slaw and our smoky house sauce.",
            "Burgers",
            "189",
            "true",
            "🍔"
          },
          {
            "Butter Chicken Bowl",
            "Rich tomato gravy, tender chicken and fragrant basmati rice.",
            "Indian",
            "299",
            "false",
            "🍛"
          },
          {
            "Masala Fries",
            "Golden fries tossed in our signature spice blend.",
            "Sides",
            "119",
            "true",
            "🍟"
          },
          {
            "Paneer Tikka Bowl",
            "Chargrilled paneer, mint chutney and fluffy basmati rice.",
            "Indian",
            "259",
            "true",
            "🥘"
          },
          {
            "Classic Chicken Burger",
            "Crispy chicken, lettuce, pickles and creamy herb mayo.",
            "Burgers",
            "219",
            "false",
            "🍔"
          },
          {
            "Chocolate Brownie",
            "A warm, fudgy chocolate brownie. A very good decision.",
            "Desserts",
            "139",
            "true",
            "🍫"
          },
          {
            "Fresh Lime Cooler",
            "Fresh lime, mint and a little sparkle. Served chilled.",
            "Drinks",
            "89",
            "true",
            "🍋"
          },
          {
            "Garden Fresh Pizza",
            "Roasted peppers, sweet corn, olives and mozzarella.",
            "Pizza",
            "289",
            "true",
            "🍕"
          },
          {
            "Mango Cheesecake",
            "Creamy cheesecake with a sunny mango topping.",
            "Desserts",
            "179",
            "true",
            "🍰"
          },
          {
            "Garlic Bread",
            "Toasted bread, garlic butter and melted cheese.",
            "Sides",
            "149",
            "true",
            "🥖"
          },
          {
            "Cold Coffee",
            "A smooth, chilled coffee with a creamy finish.",
            "Drinks",
            "129",
            "true",
            "☕"
          }
        };
        for (String[] r : rows)
          service.save(
              null,
              new MenuInput(
                  r[0], r[1], r[2], new BigDecimal(r[3]), Boolean.parseBoolean(r[4]), true, r[5]));
      }
      if (Arrays.asList(env.getActiveProfiles()).contains("demo")) {
        account(
            users, encoder, "customer@crave.test", "Demo Customer", Role.CUSTOMER, "Demo@12345");
        account(users, encoder, "staff@crave.test", "Kitchen Staff", Role.STAFF, "Demo@12345");
        account(users, encoder, "admin@crave.test", "Restaurant Admin", Role.ADMIN, "Demo@12345");
      }
      if (!adminEmail.isBlank() && !adminPassword.isBlank()) {
        if (adminPassword.length() < 12)
          throw new IllegalArgumentException("ADMIN_PASSWORD must have at least 12 characters.");
        account(
            users,
            encoder,
            adminEmail.toLowerCase(java.util.Locale.ROOT),
            "Restaurant Admin",
            Role.ADMIN,
            adminPassword);
      }
    };
  }

  private void account(
      UserRepository users,
      PasswordEncoder encoder,
      String email,
      String name,
      Role role,
      String password) {
    if (users.findByEmail(email).isEmpty()) {
      AppUser u = new AppUser();
      u.setEmail(email);
      u.setName(name);
      u.setRole(role);
      u.setPasswordHash(encoder.encode(password));
      users.save(u);
    }
  }
}
