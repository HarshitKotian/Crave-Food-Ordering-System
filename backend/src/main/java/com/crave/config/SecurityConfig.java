package com.crave.config;

import com.crave.repository.UserRepository;
import com.crave.security.GoogleSuccessHandler;
import com.nimbusds.jose.jwk.source.ImmutableSecret;
import java.nio.charset.StandardCharsets;
import java.util.List;
import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.*;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.*;

@Configuration
@EnableMethodSecurity
public class SecurityConfig {
  @Bean
  PasswordEncoder passwordEncoder() {
    return new BCryptPasswordEncoder();
  }

  @Bean
  SecretKey jwtKey(@Value("${app.jwt-secret}") String secret) {
    byte[] bytes = secret.getBytes(StandardCharsets.UTF_8);
    if (bytes.length < 32)
      throw new IllegalArgumentException("JWT_SECRET must be at least 32 bytes.");
    return new SecretKeySpec(bytes, "HmacSHA256");
  }

  @Bean
  JwtEncoder jwtEncoder(SecretKey key) {
    return new NimbusJwtEncoder(new ImmutableSecret<>(key));
  }

  @Bean
  JwtDecoder jwtDecoder(SecretKey key) {
    NimbusJwtDecoder d =
        NimbusJwtDecoder.withSecretKey(key).macAlgorithm(MacAlgorithm.HS256).build();
    d.setJwtValidator(JwtValidators.createDefaultWithIssuer("crave"));
    return d;
  }

  @Bean
  @Order(1)
  SecurityFilterChain oauthChain(
      HttpSecurity http,
      GoogleSuccessHandler success,
      @Value("${app.google-enabled}") boolean google,
      @Value("${app.frontend-url}") String frontend)
      throws Exception {
    http.securityMatcher("/oauth2/**", "/login/**")
        .authorizeHttpRequests(a -> a.anyRequest().permitAll());
    if (google)
      http.oauth2Login(
          o ->
              o.successHandler(success)
                  .failureHandler(
                      (req, res, e) -> res.sendRedirect(frontend + "/login?error=google")));
    return http.build();
  }

  @Bean
  @Order(2)
  SecurityFilterChain apiChain(HttpSecurity http, UserRepository users) throws Exception {
    http.cors(c -> {})
        .csrf(c -> c.disable())
        .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
        .authorizeHttpRequests(
            a ->
                a.requestMatchers(HttpMethod.OPTIONS, "/**")
                    .permitAll()
                    .requestMatchers(
                        "/api/auth/register",
                        "/api/auth/login",
                        "/api/auth/config",
                        "/api/auth/google/exchange",
                        "/api/health")
                    .permitAll()
                    .requestMatchers(HttpMethod.GET, "/api/menu")
                    .permitAll()
                    .anyRequest()
                    .authenticated())
        .oauth2ResourceServer(
            o ->
                o.jwt(
                    j ->
                        j.jwtAuthenticationConverter(
                            jwt -> {
                              var user =
                                  users
                                      .findById(Long.valueOf(jwt.getSubject()))
                                      .orElseThrow(
                                          () ->
                                              new org.springframework.security.oauth2.core
                                                  .OAuth2AuthenticationException("invalid_token"));
                              return new JwtAuthenticationToken(
                                  jwt,
                                  List.of(new SimpleGrantedAuthority("ROLE_" + user.getRole())),
                                  jwt.getSubject());
                            })))
        .exceptionHandling(
            e ->
                e.authenticationEntryPoint(
                        (req, res, ex) -> {
                          res.setStatus(401);
                          res.setContentType("application/json");
                          res.getWriter().write("{\"message\":\"Please sign in to continue.\"}");
                        })
                    .accessDeniedHandler(
                        (req, res, ex) -> {
                          res.setStatus(403);
                          res.setContentType("application/json");
                          res.getWriter()
                              .write(
                                  "{\"message\":\"You do not have permission for this action.\"}");
                        }));
    return http.build();
  }

  @Bean
  CorsConfigurationSource cors(@Value("${app.frontend-url}") String frontend) {
    CorsConfiguration c = new CorsConfiguration();
    c.setAllowedOrigins(List.of(frontend));
    c.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
    c.setAllowedHeaders(List.of("Authorization", "Content-Type", "Idempotency-Key"));
    UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
    source.registerCorsConfiguration("/**", c);
    return source;
  }
}
