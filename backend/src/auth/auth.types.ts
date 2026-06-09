export interface JwtPayload {
  sub: string;   // userId
  email: string;
  jti: string;   // unique token id — used for blacklisting
  iat?: number;
  exp?: number;
}

/** Returned by auth service methods; controller sets tokens as HttpOnly cookies. */
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  user: { id: string; email: string; name: string | null };
}

/** Shape sent back to the client after login/register/refresh. */
export interface AuthResponse {
  user: { id: string; email: string; name: string | null };
}
