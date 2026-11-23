package com.crave.security;

import com.crave.dto.Api.*;
import com.crave.entity.AppUser;
import java.time.Instant;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.stereotype.Service;

@Service
public class TokenService {
  private final JwtEncoder encoder;

  public TokenService(JwtEncoder e) {
    encoder = e;
  }

  public AuthResponse issue(AppUser user) {
    Instant now = Instant.now();
    var claims =
        JwtClaimsSet.builder()
            .issuer("crave")
            .subject(user.getId().toString())
            .issuedAt(now)
            .expiresAt(now.plusSeconds(7200))
            .build();
    String token =
        encoder
            .encode(JwtEncoderParameters.from(JwsHeader.with(MacAlgorithm.HS256).build(), claims))
            .getTokenValue();
    return new AuthResponse(token, UserView.of(user));
  }
}
