import type { auth } from './auth.instance';

export const BETTER_AUTH = Symbol('BETTER_AUTH');

export type BetterAuthInstance = typeof auth;
