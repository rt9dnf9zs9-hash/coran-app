import { useState, type FormEvent } from 'react';
import { Button, Card, ErrorState } from '../components/ui';
import { messageOf } from '../lib/errors';
import { navigate } from '../lib/router';
import { useStore } from '../lib/store';
import { appUrl, supabase } from '../lib/supabase';

// Fournisseurs activés dans Supabase (ex. "google,apple"), sinon seuls l'e-mail et le mot de passe sont proposés.
const OAUTH = String(import.meta.env.VITE_OAUTH_PROVIDERS ?? '').split(',').map((x) => x.trim()).filter(Boolean);

const TITLES: Record<string, string> = {
  connexion: 'Se connecter',
  inscription: 'Créer un compte',
  'mot-de-passe-oublie': 'Mot de passe oublié',
  'nouveau-mot-de-passe': 'Nouveau mot de passe',
};

export function AuthPage({ mode, next }: { mode: string; next: string | null }) {
  const { userId, settings, updateSettings } = useStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [age, setAge] = useState<string>(settings.ageBracket ?? '');
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [fieldErr, setFieldErr] = useState<Record<string, string>>({});

  if (!supabase) {
    return <ErrorState message="Les comptes ne sont pas encore activés sur cette installation (backend non configuré). Vous pouvez utiliser le mode découverte : votre progression reste sur cet appareil." />;
  }
  if (userId && mode !== 'nouveau-mot-de-passe') {
    return (
      <Card>
        <p>Vous êtes connecté.</p>
        <Button variant="primary" onClick={() => navigate(next ?? '/')}>Continuer</Button>
      </Card>
    );
  }

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (mode !== 'nouveau-mot-de-passe' && !/^\S+@\S+\.\S+$/.test(email)) errs.email = 'Entrez une adresse e-mail valide.';
    if ((mode === 'connexion' || mode === 'inscription' || mode === 'nouveau-mot-de-passe') && password.length < 8) errs.password = 'Le mot de passe doit contenir au moins 8 caractères.';
    if (mode === 'inscription' && !age) errs.age = 'Indiquez votre tranche d’âge.';
    if (mode === 'inscription' && age === 'under15' && !consent) errs.consent = 'L’accord d’un parent est nécessaire avant 15 ans.';
    setFieldErr(errs);
    return Object.keys(errs).length === 0;
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      const sb = supabase!;
      if (mode === 'connexion') {
        const { error } = await sb.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate(next ?? '/');
      } else if (mode === 'inscription') {
        const { data, error } = await sb.auth.signUp({ email, password, options: { emailRedirectTo: appUrl() } });
        if (error) throw error;
        await updateSettings({ ageBracket: age as never });
        if (data.session) navigate(next ?? '/');
        else setInfo('Compte créé. Un e-mail de confirmation vient d’être envoyé : cliquez sur le lien pour activer votre compte.');
      } else if (mode === 'mot-de-passe-oublie') {
        const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: appUrl() });
        if (error) throw error;
        setInfo('Si un compte existe pour cette adresse, un e-mail de réinitialisation vient d’être envoyé.');
      } else if (mode === 'nouveau-mot-de-passe') {
        const { error } = await sb.auth.updateUser({ password });
        if (error) throw error;
        setInfo('Mot de passe modifié.');
        navigate('/', true);
      }
    } catch (err) {
      setError(messageOf(err, 'auth'));
    } finally {
      setBusy(false);
    }
  }

  async function oauth(provider: 'google' | 'apple') {
    setError(null);
    const { error } = await supabase!.auth.signInWithOAuth({ provider, options: { redirectTo: appUrl() } });
    if (error) setError(messageOf(error, 'auth'));
  }

  return (
    <div className="stack" style={{ maxWidth: 460, margin: '0 auto' }}>
      <h1>{TITLES[mode] ?? 'Connexion'}</h1>
      {mode === 'inscription' && <p className="muted small">Un compte sert à sauvegarder votre progression et à la retrouver sur tous vos appareils. Votre progression en mode découverte sera conservée.</p>}
      {info && <div className="card soft" role="status">{info}</div>}
      {error && <div className="card err" role="alert">{error}</div>}
      <form onSubmit={submit} noValidate className="card">
        {mode !== 'nouveau-mot-de-passe' && (
          <div className="field">
            <label htmlFor="email">Adresse e-mail</label>
            <input id="email" type="email" autoComplete="email" placeholder="nom@exemple.fr" value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={!!fieldErr.email} aria-describedby="email-err" />
            {fieldErr.email && <div id="email-err" className="field-error">{fieldErr.email}</div>}
          </div>
        )}
        {mode !== 'mot-de-passe-oublie' && (
          <div className="field">
            <label htmlFor="pw">{mode === 'nouveau-mot-de-passe' ? 'Nouveau mot de passe' : 'Mot de passe'}</label>
            <input id="pw" type="password" autoComplete={mode === 'connexion' ? 'current-password' : 'new-password'} value={password} onChange={(e) => setPassword(e.target.value)} aria-invalid={!!fieldErr.password} aria-describedby="pw-err" />
            {fieldErr.password && <div id="pw-err" className="field-error">{fieldErr.password}</div>}
          </div>
        )}
        {mode === 'inscription' && (
          <>
            <div className="field">
              <label htmlFor="age">Tranche d’âge</label>
              <select id="age" value={age} onChange={(e) => setAge(e.target.value)} aria-invalid={!!fieldErr.age}>
                <option value="">Choisir…</option>
                <option value="under15">Moins de 15 ans</option>
                <option value="15_17">15 à 17 ans</option>
                <option value="18_plus">18 ans ou plus</option>
              </select>
              {fieldErr.age && <div className="field-error">{fieldErr.age}</div>}
            </div>
            {age === 'under15' && (
              <div className="field">
                <label className="row" style={{ fontWeight: 400 }}>
                  <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} /> Un parent ou tuteur légal a donné son accord pour la création de ce compte.
                </label>
                {fieldErr.consent && <div className="field-error">{fieldErr.consent}</div>}
              </div>
            )}
          </>
        )}
        <Button variant="primary" block busy={busy} type="submit">{TITLES[mode] ?? 'Valider'}</Button>
      </form>

      {(mode === 'connexion' || mode === 'inscription') && OAUTH.length > 0 && (
        <div className="stack">
          {OAUTH.includes('google') && <Button block onClick={() => oauth('google')}>Continuer avec Google</Button>}
          {OAUTH.includes('apple') && <Button block onClick={() => oauth('apple')}>Continuer avec Apple</Button>}
        </div>
      )}
      <p className="small center">
        {mode === 'connexion' && <><a href="#/auth/mot-de-passe-oublie">Mot de passe oublié ?</a> · <a href={`#/auth/inscription${next ? `?next=${encodeURIComponent(next)}` : ''}`}>Créer un compte</a></>}
        {mode === 'inscription' && <a href={`#/auth/connexion${next ? `?next=${encodeURIComponent(next)}` : ''}`}>J’ai déjà un compte</a>}
        {mode === 'mot-de-passe-oublie' && <a href="#/auth/connexion">Retour à la connexion</a>}
      </p>
      <p className="small muted center">Nous enregistrons votre progression pour la synchroniser entre vos appareils. Pas de publicité, pas de revente de données. <a href="#/confidentialite">En savoir plus</a></p>
    </div>
  );
}
