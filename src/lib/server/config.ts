import { env } from '$env/dynamic/private';

export const config = {
  jwtSecret: env.JWT_SECRET || 'fallback_secret_for_local_development_only',

  accessTokenDuration: Number(env.ACCESS_TOKEN_DURATION) || 300,
};
