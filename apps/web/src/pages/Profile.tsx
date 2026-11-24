import { useState } from 'react';
import { Ar } from '../components/arabic';
import { Button, Card, LinkButton } from '../components/ui';
import { messageOf } from '../lib/errors';
import { local } from '../lib/storage';
import { useStore, type Settings } from '../lib/store';
import { supabase } from '../lib/supabase';

export function ProfilePage() {
  const s = useStore();
  const { settings, updateSettings, entitlement, userId, email } = s;
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmText, setConfirmText] = useState('');
  const [showDelete, setShowDelete] = useState(false);

  async function portal() {
    setBusy('portal');
    setError(null);
    const { data, error } = await supabase!.functions.invoke('stripe-portal', { body: {} });
    setBusy(null);
    if (error || !data?.url) return setError('Impossible d’ouvrir la gestion de l’abonnement. Réessayez.');
    window.location.href = data.url;
  }

  async function exportData() {
    const payload: Record<string, unknown> = { exportedAt: new Date().toISOString(), settings, progress: s.progress, reviewCards: s.cards, studyDays: s.studyDays };
    if (supabase && userId) {
      const [profile, quiz, subs] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
        supabase.from('quiz_results').select('*'),
        supabase.from('subscriptions').select('provider, status, current_period_end, cancel_at_period_end, updated_at'),
      ]);
      Object.assign(payload, { account: { email }, profile: profile.data, quizResults: quiz.data, subscriptions: subs.data });
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'mes-donnees-arabe-du-coran.json';
    a.click();
    URL.revokeObjectURL(a.href);
  }

  async function deleteAccount() {
    if (confirmText !== 'SUPPRIMER') return setError('Tapez SUPPRIMER pour confirmer.');
    setBusy('delete');
    setError(null);
    try {
      const { data, error } = await supabase!.functions.invoke('delete-account', { body: { confirm: 'SUPPRIMER' } });
      if (error) throw error;
      local.remove(`u:${userId}:progress`);
      local.remove(`u:${userId}:cards`);
      local.remove(`u:${userId}:days`);
      await supabase!.auth.signOut();
      const stores: string[] = data?.store_subscriptions_to_cancel ?? [];
      alert(`Votre compte et vos données ont été supprimés.${stores.length ? ' Pensez à résilier votre abonnement dans les réglages de votre boutique (App Store ou Google Play) : nous ne pouvons pas le faire à votre place.' : ''}`);
      window.location.hash = '/';
    } catch (e) {
      setError(messageOf(e));
    } finally {
      setBusy(null);
    }
  }

  const set = <K extends keyof Settings>(k: K) => (v: Settings[K]) => updateSettings({ [k]: v } as Partial<Settings>);

  return (
    <div className="stack">
      <h1>Profil</h1>
      {error && <div className="card err" role="alert">{error}</div>}

      <Card>
        <h2>Compte</h2>
        {userId ? <p style={{ margin: 0 }}>Connecté : <strong>{email}</strong></p> : (
          <>
            <p className="small">Mode découverte : votre progression est gardée sur cet appareil uniquement.</p>
            {s.backend && <div className="row"><LinkButton href="#/auth/inscription" variant="primary">Créer un compte</LinkButton><LinkButton href="#/auth/connexion">Se connecter</LinkButton></div>}
          </>
        )}
      </Card>

      {userId && (
        <Card>
          <h2>Abonnement</h2>
          {entitlement.premium ? (
            <>
              <p>Premium actif{entitlement.expiresAt ? ` — ${entitlement.cancelAtPeriodEnd ? 'prend fin' : 'se renouvelle'} le ${new Date(entitlement.expiresAt).toLocaleDateString('fr-FR')}` : ''}.</p>
              {entitlement.provider === 'stripe' && <Button busy={busy === 'portal'} onClick={portal}>Gérer ou résilier mon abonnement</Button>}
              {entitlement.provider === 'app_store' && <p className="small">Abonnement souscrit sur iPhone : gérez-le dans Réglages → votre nom → Abonnements.</p>}
              {entitlement.provider === 'play_store' && <p className="small">Abonnement souscrit sur Android : gérez-le dans Google Play → Paiements et abonnements.</p>}
            </>
          ) : (
            <>
              <p className="small">Vous utilisez le parcours gratuit (modules 1 à 5).</p>
              <LinkButton href="#/premium">Voir l’offre Premium</LinkButton>
            </>
          )}
        </Card>
      )}

      <Card>
        <h2>Préférences</h2>
        <div className="field">
          <label htmlFor="goal">Objectif quotidien</label>
          <select id="goal" value={settings.dailyGoalMin} onChange={(e) => set('dailyGoalMin')(Number(e.target.value))}>
            {[5, 10, 15, 20, 30].map((m) => <option key={m} value={m}>{m} minutes</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="font">Police arabe</label>
          <select id="font" value={settings.arabicFont} onChange={(e) => set('arabicFont')(e.target.value as Settings['arabicFont'])}>
            <option value="amiri">Amiri (classique)</option>
            <option value="scheherazade">Scheherazade (voyelles plus espacées)</option>
          </select>
          <p style={{ margin: '.5rem 0 0' }}>Aperçu : <Ar>كِتَابٌ</Ar></p>
        </div>
        <div className="field">
          <label htmlFor="arscale">Taille du texte arabe : {Math.round(settings.arabicScale * 100)} %</label>
          <input id="arscale" type="range" min={1} max={2.6} step={0.1} value={settings.arabicScale} onChange={(e) => set('arabicScale')(Number(e.target.value))} style={{ width: '100%' }} />
        </div>
        <div className="field">
          <label htmlFor="txscale">Taille du texte français : {Math.round(settings.textScale * 100)} %</label>
          <input id="txscale" type="range" min={0.9} max={2} step={0.1} value={settings.textScale} onChange={(e) => set('textScale')(Number(e.target.value))} style={{ width: '100%' }} />
        </div>
        <div className="field">
          <label htmlFor="translit">Translittération</label>
          <select id="translit" value={settings.translitMode} onChange={(e) => set('translitMode')(e.target.value as Settings['translitMode'])}>
            <option value="always">Toujours affichée</option>
            <option value="progressive">Progressive (masquable après le module 4)</option>
            <option value="hidden">Masquée</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="rate">Vitesse audio par défaut</label>
          <select id="rate" value={settings.audioRate} onChange={(e) => set('audioRate')(Number(e.target.value) as Settings['audioRate'])}>
            <option value={1}>Normale (1×)</option>
            <option value={0.75}>Lente (0,75×)</option>
            <option value={0.5}>Très lente (0,5×)</option>
          </select>
        </div>
        <label className="row" style={{ fontWeight: 400 }}><input type="checkbox" checked={settings.autoplay} onChange={(e) => set('autoplay')(e.target.checked)} /> Lire automatiquement l’audio des exercices d’écoute</label>
        <div className="field" style={{ marginTop: '.9rem' }}>
          <label htmlFor="theme">Thème</label>
          <select id="theme" value={settings.theme} onChange={(e) => set('theme')(e.target.value as Settings['theme'])}>
            <option value="system">Selon l’appareil</option><option value="light">Clair</option><option value="dark">Sombre</option>
          </select>
        </div>
      </Card>

      <Card>
        <h2>Données</h2>
        <div className="stack">
          <Button onClick={exportData}>Télécharger mes données</Button>
          <a href="#/confidentialite" className="small">Politique de confidentialité</a> <a href="#/conditions" className="small">Conditions d’utilisation</a>
        </div>
      </Card>

      {userId && (
        <Card>
          <div className="stack">
            <Button onClick={() => s.signOut()}>Se déconnecter</Button>
            {!showDelete ? (
              <Button variant="danger" onClick={() => setShowDelete(true)}>Supprimer mon compte</Button>
            ) : (
              <div className="card err">
                <p><strong>Suppression définitive.</strong> Votre compte, votre progression et vos révisions seront effacés. Un abonnement web sera résilié immédiatement, sans remboursement automatique de la période en cours. Un abonnement souscrit sur l’App Store ou Google Play doit être résilié dans la boutique.</p>
                <label htmlFor="confirm">Tapez SUPPRIMER pour confirmer</label>
                <input id="confirm" type="text" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} autoComplete="off" />
                <div className="row" style={{ marginTop: '.75rem' }}>
                  <Button variant="danger" busy={busy === 'delete'} onClick={deleteAccount}>Supprimer définitivement</Button>
                  <Button variant="ghost" onClick={() => setShowDelete(false)}>Annuler</Button>
                </div>
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
