import { SignJWT, jwtVerify } from 'jose';

const rawSecret = process.env.JWT_SECRET || 'dev_secret_change_me';

if (process.env.NODE_ENV === 'production' && rawSecret === 'dev_secret_change_me') {
  console.error('FATAL: JWT_SECRET must be set in production environment!');
  process.exit(1);
}

const secret = new TextEncoder().encode(rawSecret);

export async function signToken(payload: Record<string, unknown>, expiresIn = '7d') {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime(expiresIn)
    .setIssuedAt()
    .sign(secret);
}

export async function verifyToken(token: string) {
  const { payload } = await jwtVerify(token, secret);
  return payload;
}
