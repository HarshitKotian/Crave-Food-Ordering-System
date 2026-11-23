package com.crave.security;

import com.crave.exception.ApiException;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.stereotype.Component;

@Component
public class OAuthCodes {
  private record Entry(Long userId, Instant expires) {}

  private final Map<String, Entry> entries = new ConcurrentHashMap<>();

  public String create(Long userId) {
    entries.entrySet().removeIf(e -> e.getValue().expires().isBefore(Instant.now()));
    String code = UUID.randomUUID().toString() + UUID.randomUUID();
    entries.put(code, new Entry(userId, Instant.now().plusSeconds(60)));
    return code;
  }

  public Long consume(String code) {
    Entry e = entries.remove(code);
    if (e == null || e.expires().isBefore(Instant.now()))
      throw ApiException.bad("Login expired. Try Google sign-in again.");
    return e.userId();
  }
}
