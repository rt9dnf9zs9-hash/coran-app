// Gestion centralisée des erreurs : jamais de message technique brut à l'écran.

export type ErrorKind = 'offline' | 'session_expired' | 'premium_required' | 'load' | 'audio' | 'payment' | 'sync' | 'auth' | 'unknown';

export class AppError extends Error {
  constructor(public kind: ErrorKind, message: string, public cause?: unknown) {
    super(message);
  }
}

const MESSAGES: Record<ErrorKind, string> = {
  offline: 'Vous êtes hors ligne. Vos réponses seront synchronisées au retour de la connexion.',
  session_expired: 'Votre session a expiré. Reconnectez-vous pour continuer.',
  premium_required: 'Cette leçon fait partie de l’offre Premium.',
  load: 'Impossible de charger ce contenu. Vérifiez votre connexion puis réessayez.',
  audio: 'L’audio n’a pas pu être lu. Réessayez dans un instant.',
  payment: 'Le paiement n’a pas pu être lancé. Aucun montant n’a été prélevé. Réessayez.',
  sync: 'Votre progression n’a pas encore pu être synchronisée. Elle est gardée sur cet appareil.',
  auth: 'Connexion impossible. Vérifiez votre e-mail et votre mot de passe.',
  unknown: 'Une erreur est survenue. Réessayez.',
};

const AUTH_MESSAGES: [RegExp, string][] = [
  [/invalid login credentials/i, 'E-mail ou mot de passe incorrect.'],
  [/email not confirmed/i, 'Confirmez d’abord votre adresse e-mail (vérifiez vos courriers, y compris les indésirables).'],
  [/user already registered/i, 'Un compte existe déjà avec cet e-mail. Connectez-vous.'],
  [/password should be at least/i, 'Le mot de passe doit contenir au moins 8 caractères.'],
  [/rate limit|too many/i, 'Trop de tentatives. Patientez quelques minutes.'],
  [/jwt expired|refresh token/i, MESSAGES.session_expired],
];

export function toAppError(e: unknown, fallback: ErrorKind = 'unknown'): AppError {
  if (e instanceof AppError) return e;
  if (typeof navigator !== 'undefined' && !navigator.onLine) return new AppError('offline', MESSAGES.offline, e);
  const msg = String((e as { message?: string })?.message ?? e ?? '');
  if (/premium_required/.test(msg)) return new AppError('premium_required', MESSAGES.premium_required, e);
  if (/not_authenticated|jwt expired|session/i.test(msg)) return new AppError('session_expired', MESSAGES.session_expired, e);
  if (/failed to fetch|networkerror|load failed/i.test(msg)) return new AppError('offline', MESSAGES.offline, e);
  for (const [re, fr] of AUTH_MESSAGES) if (re.test(msg)) return new AppError('auth', fr, e);
  return new AppError(fallback, MESSAGES[fallback], e);
}

export function messageOf(e: unknown, fallback: ErrorKind = 'unknown'): string {
  return toAppError(e, fallback).message;
}

export { MESSAGES };
