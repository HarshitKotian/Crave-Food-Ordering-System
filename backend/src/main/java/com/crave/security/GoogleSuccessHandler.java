package com.crave.security;

import com.crave.service.UserService;
import jakarta.servlet.http.*;
import java.io.IOException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

@Component
public class GoogleSuccessHandler implements AuthenticationSuccessHandler {
  private final UserService users;
  private final OAuthCodes codes;
  private final String frontend;

  public GoogleSuccessHandler(UserService u, OAuthCodes c, @Value("${app.frontend-url}") String f) {
    users = u;
    codes = c;
    frontend = f;
  }

  @Override
  public void onAuthenticationSuccess(
      HttpServletRequest request, HttpServletResponse response, Authentication auth)
      throws IOException {
    String destination = frontend + "/login?error=google";
    try {
      OidcUser oidc = (OidcUser) auth.getPrincipal();
      if (Boolean.TRUE.equals(oidc.getEmailVerified())) {
        var user = users.google(oidc.getSubject(), oidc.getEmail(), oidc.getFullName());
        destination = frontend + "/oauth/callback#code=" + codes.create(user.getId());
      }
    } catch (RuntimeException e) {
      /* Do not leak provider/account details to the browser. */
    }
    if (request.getSession(false) != null) request.getSession(false).invalidate();
    org.springframework.security.core.context.SecurityContextHolder.clearContext();
    response.sendRedirect(destination);
  }
}
