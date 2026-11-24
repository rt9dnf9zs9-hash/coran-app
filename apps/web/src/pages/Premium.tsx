import { useEffect, useState } from 'react';
import { Button, Card, ErrorState, Icon, LinkButton, Skeleton } from '../components/ui';
import { messageOf } from '../lib/errors';
import { navigate } from '../lib/router';
import { useStore } from '../lib/store';
import { supabase } from '../lib/supabase';

interface Price { display: string; amount_cents: number; stripe_price_id: string | null }

function usePrice(): Price | null | 'error' {
  const [p, setP] = useState<Price | null | 'error'>(null);
  useEffect(() => {
    if (!supabase) return setP({ display: '—', amount_cents: 0, stripe_price_id: null });
    supabase.from('app_settings').select('value').eq('key', 'premium_price').maybeSingle()
      .then(({ data, error }) => setP(error || !data ? 'error' : (data.value as Price)));
  }, []);
  return p;
}

const INCLUDED = [
  'Module 6 — Introduction à la conjugaison (passé, présent, futur, impératif)',
  'Module 7 — Grammaire approfondie (phrases, pronoms, prépositions, cas)',
  'Module 8 — Compréhension approfondie : analyse de versets',
  'Exercices avancés et tests de fin de module',
  'Audios des modules avancés',
];

/** Présentation de l'offre : prix, durée, renouvellement, résiliation — sans fausse urgence. */
export function PremiumOffer({ intro }: { intro?: string }) {
  const { userId, entitlement, backend } = useStore();
  const price = usePrice();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function subscribe() {
    if (!supabase) return;
    if (!userId) return navigate('/auth/inscription?next=/premium');
    setBusy(true);
    setError(null);
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', { body: {} });
      if (error) {
        const ctx = (error as { context?: Response }).context;
        const body = ctx ? await ctx.json().catch(() => null) : null;
        throw new Error(body?.error?.message ?? messageOf(error, 'payment'));
      }
      if (!data?.url) throw new Error('payment');
      window.location.href = data.url; // page de paiement sécurisée Stripe
    } catch (e) {
      const msg = (e as Error).message;
      setError(msg && msg !== 'payment' && !/fetch/i.test(msg) ? msg : messageOf(e, 'payment'));
      setBusy(false);
    }
  }

  if (entitlement.premium) {
    return <Card tone="soft"><h2>Votre abonnement Premium est actif</h2><p>Les modules 6, 7 et 8 sont ouverts.</p><LinkButton href="#/module/6" variant="primary">Commencer la conjugaison</LinkButton></Card>;
  }
  return (
    <div className="stack">
      <div className="center">
        <div className="small" style={{ color: 'var(--gold-ink)' }}>{intro ?? 'Après le parcours gratuit'}</div>
        <h1>Prochaine étape : la conjugaison</h1>
      </div>
      <Card>
        <h3>Inclus dans Premium</h3>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }} className="stack">
          {INCLUDED.map((x) => <li key={x} className="row" style={{ flexWrap: 'nowrap' }}><span style={{ color: 'var(--primary)' }}><Icon name="check" size={20} /></span>{x}</li>)}
        </ul>
      </Card>
      <Card tone="gold">
        {price === null ? <Skeleton lines={1} /> : price === 'error' ? <p>Prix momentanément indisponible.</p> : (
          <div className="center">
            <div style={{ fontSize: '1.8rem', fontWeight: 700 }}>{price.display} <span style={{ fontSize: '1rem', fontWeight: 400 }}>par an, TTC</span></div>
            {price.amount_cents > 0 && <div className="small muted">soit {(price.amount_cents / 1200).toFixed(2).replace('.', ',')} € par mois, payé en une fois pour 12 mois</div>}
          </div>
        )}
      </Card>
      <Card>
        <h3>Conditions, en clair</h3>
        <ul className="small" style={{ margin: 0 }}>
          <li><strong>Durée :</strong> 12 mois à partir du paiement.</li>
          <li><strong>Renouvellement :</strong> automatique chaque année, au même prix sauf information préalable. Un e-mail de rappel est envoyé avant chaque renouvellement.</li>
          <li><strong>Résiliation :</strong> à tout moment depuis Profil → Abonnement, en quelques clics. L’accès reste ouvert jusqu’à la fin de la période payée.</li>
          <li><strong>Droit de rétractation :</strong> en demandant l’accès immédiat au contenu, vous renoncez au délai de 14 jours une fois l’accès commencé.</li>
          <li><strong>Modules 1 à 5 :</strong> gratuits pour toujours, avec ou sans abonnement. Votre progression est conservée même si vous arrêtez Premium.</li>
        </ul>
      </Card>
      {error && <ErrorState message={error} />}
      {backend ? (
        <Button variant="primary" block busy={busy} onClick={subscribe} disabled={price === 'error' || (typeof price === 'object' && !!price && !price.stripe_price_id)}>
          {userId ? 'S’abonner pour un an' : 'Créer un compte pour s’abonner'}
        </Button>
      ) : <Card><p className="small" style={{ margin: 0 }}>Le paiement n’est pas activé sur cette installation.</p></Card>}
      {typeof price === 'object' && price && !price.stripe_price_id && backend && <p className="small muted center">L’abonnement sera bientôt disponible.</p>}
      <LinkButton href="#/apprendre" block>Continuer le parcours gratuit</LinkButton>
      <p className="small muted center">Paiement sécurisé par Stripe. Aucune donnée bancaire ne transite par nos serveurs.</p>
    </div>
  );
}

export function PremiumPage() {
  return <PremiumOffer />;
}

/** Retour de Stripe : on n'accorde RIEN sur la base de cette page ; on attend la confirmation du webhook. */
export function PremiumReturn({ outcome }: { outcome: 'succes' | 'annule' }) {
  const { refreshEntitlement, entitlement } = useStore();
  const [waited, setWaited] = useState(0);
  useEffect(() => {
    if (outcome !== 'succes' || entitlement.premium) return;
    const t = window.setInterval(() => {
      setWaited((w) => w + 2);
      refreshEntitlement().catch(() => undefined);
    }, 2000);
    return () => window.clearInterval(t);
  }, [outcome, entitlement.premium, refreshEntitlement]);

  if (outcome === 'annule') {
    return (
      <Card>
        <h1>Paiement annulé</h1>
        <p>Aucun montant n’a été prélevé. Vous pouvez continuer le parcours gratuit ou revenir à l’offre plus tard.</p>
        <div className="stack"><LinkButton href="#/apprendre" variant="primary">Continuer le parcours gratuit</LinkButton><LinkButton href="#/premium">Revoir l’offre</LinkButton></div>
      </Card>
    );
  }
  if (entitlement.premium) {
    return (
      <Card tone="soft">
        <h1>Bienvenue dans Premium</h1>
        <p>Votre abonnement est confirmé{entitlement.expiresAt ? ` jusqu’au ${new Date(entitlement.expiresAt).toLocaleDateString('fr-FR')}` : ''}. Il est disponible sur tous vos appareils connectés à ce compte.</p>
        <LinkButton href="#/module/6" variant="primary">Commencer le module 6</LinkButton>
      </Card>
    );
  }
  return (
    <Card>
      <h1>Paiement en cours de confirmation</h1>
      <p aria-live="polite">Nous attendons la confirmation de Stripe. Cela prend généralement quelques secondes.</p>
      <Skeleton lines={1} />
      {waited > 40 && (
        <p className="small">La confirmation prend plus de temps que prévu. Votre accès s’activera automatiquement dès réception ; vous pouvez fermer cette page. Si rien ne change d’ici une heure, contactez le support depuis votre profil.</p>
      )}
    </Card>
  );
}
