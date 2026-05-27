export interface JwtPayload {
  sub: string;   // userId
  email: string;
  jti: string;   // unique token id — used for blacklisting
  iat?: number;
  exp?: number;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}
