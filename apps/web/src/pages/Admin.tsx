import { validateExercise, type Exercise } from '@coran/core';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Button, Card, ErrorState, Skeleton } from '../components/ui';
import { invalidateAudioAssets } from '../lib/audio';
import { messageOf } from '../lib/errors';
import { navigate } from '../lib/router';
import { useStore } from '../lib/store';
import { supabase } from '../lib/supabase';

// L'accès réel est contrôlé côté serveur (RLS + is_admin) : cet écran n'est qu'une interface.
const TABS: [string, string][] = [['stats', 'Statistiques'], ['contenu', 'Contenu'], ['vocabulaire', 'Traductions'], ['audio', 'Audios'], ['utilisateurs', 'Utilisateurs'], ['abonnements', 'Abonnements'], ['prix', 'Prix']];

function useQuery<T>(fn: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const run = useCallback(() => {
    setError(null);
    fn().then(setData).catch((e) => setError(messageOf(e, 'load')));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  useEffect(run, [run]);
  return { data, error, reload: run };
}

async function q<T>(p: PromiseLike<{ data: T | null; error: unknown }>): Promise<T> {
  const { data, error } = await p;
  if (error) throw error;
  return data as T;
}

export default function AdminPage({ tab = 'stats' }: { tab?: string }) {
  const { isAdmin, userId } = useStore();
  if (!supabase || !userId) return <ErrorState message="Connectez-vous avec un compte administrateur." />;
  if (!isAdmin) return <ErrorState message="Accès réservé aux administrateurs." />;
  let body: ReactNode;
  switch (tab) {
    case 'contenu': body = <ContentAdmin />; break;
    case 'vocabulaire': body = <VocabAdmin />; break;
    case 'audio': body = <AudioAdmin />; break;
    case 'utilisateurs': body = <UsersAdmin />; break;
    case 'abonnements': body = <SubsAdmin />; break;
    case 'prix': body = <PriceAdmin />; break;
    default: body = <StatsAdmin />;
  }
  return (
    <div className="stack">
      <h1>Administration</h1>
      <div className="tabs" role="tablist">
        {TABS.map(([id, label]) => <button key={id} type="button" role="tab" className="btn" aria-selected={tab === id} onClick={() => navigate(`/admin/${id}`)}>{label}</button>)}
      </div>
      {body}
    </div>
  );
}

function StatsAdmin() {
  const { data, error, reload } = useQuery(() => q(supabase!.rpc('admin_stats')));
  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (!data) return <Skeleton />;
  const d = data as Record<string, number | { module_id: number; completed: number; started: number }[]>;
  return (
    <div className="stack">
      <div className="grid2">
        {(['users', 'active_7d', 'premium', 'lessons_completed', 'failed_payments_30d'] as const).map((k) => (
          <Card key={k}><div className="small muted">{{ users: 'Comptes', active_7d: 'Actifs (7 jours)', premium: 'Abonnés Premium', lessons_completed: 'Leçons validées', failed_payments_30d: 'Paiements échoués (30 j)' }[k]}</div><strong style={{ fontSize: '1.4rem' }}>{String(d[k])}</strong></Card>
        ))}
      </div>
      <Card>
        <h2>Par module</h2>
        <table className="t"><thead><tr><th>Module</th><th>Leçons commencées</th><th>Leçons validées</th></tr></thead>
          <tbody>{(d.by_module as { module_id: number; completed: number; started: number }[]).map((m) => <tr key={m.module_id}><td>{m.module_id}</td><td>{m.started}</td><td>{m.completed}</td></tr>)}</tbody></table>
      </Card>
    </div>
  );
}

type LessonRow = { id: string; module_id: number; position: number; title_fr: string; objective_fr: string; kind: string; published: boolean };
type ModuleRow = { id: number; title_fr: string; subtitle_fr: string; tier: string; published: boolean; position: number };

function ContentAdmin() {
  const { refreshCatalog, showToast } = useStore();
  const mods = useQuery(() => q<ModuleRow[]>(supabase!.from('modules').select('*').order('position')));
  const lessons = useQuery(() => q<LessonRow[]>(supabase!.from('lessons').select('id, module_id, position, title_fr, objective_fr, kind, published').order('module_id').order('position')));
  const [editing, setEditing] = useState<string | null>(null);
  const [newModule, setNewModule] = useState({ id: '', title: '', tier: 'premium' });
  const [newLesson, setNewLesson] = useState({ id: '', module: '', title: '' });
  const [err, setErr] = useState<string | null>(null);

  async function toggle(table: 'modules' | 'lessons', id: string | number, published: boolean) {
    const { error } = await supabase!.from(table).update({ published }).eq('id', id);
    if (error) return setErr(messageOf(error));
    mods.reload(); lessons.reload(); void refreshCatalog();
    showToast(published ? 'Publié' : 'Dépublié');
  }
  async function addModule() {
    const id = Number(newModule.id);
    if (!id || !newModule.title.trim()) return setErr('Indiquez un numéro et un titre.');
    const { error } = await supabase!.from('modules').insert({ id, course_id: 1, position: id, title_fr: newModule.title.trim(), tier: newModule.tier, published: false });
    if (error) return setErr(messageOf(error));
    setNewModule({ id: '', title: '', tier: 'premium' }); mods.reload();
  }
  async function addLesson() {
    if (!/^[a-z0-9-]+$/.test(newLesson.id) || !newLesson.module || !newLesson.title.trim()) return setErr('Identifiant (minuscules, chiffres, tirets), module et titre requis.');
    const pos = (lessons.data ?? []).filter((l) => l.module_id === Number(newLesson.module)).length + 1;
    const { error } = await supabase!.from('lessons').insert({ id: newLesson.id, module_id: Number(newLesson.module), position: pos, title_fr: newLesson.title.trim(), published: false });
    if (error) return setErr(messageOf(error));
    await supabase!.from('lesson_contents').insert({ lesson_id: newLesson.id, content: { steps: [], exercises: [], summary: [] } });
    setNewLesson({ id: '', module: '', title: '' }); lessons.reload(); setEditing(newLesson.id);
  }

  if (mods.error || lessons.error) return <ErrorState message={(mods.error ?? lessons.error)!} onRetry={() => { mods.reload(); lessons.reload(); }} />;
  if (!mods.data || !lessons.data) return <Skeleton />;
  if (editing) return <LessonEditor id={editing} onClose={() => { setEditing(null); lessons.reload(); void refreshCatalog(); }} />;
  return (
    <div className="stack">
      {err && <div className="card err" role="alert">{err}</div>}
      {mods.data.map((m) => (
        <Card key={m.id}>
          <div className="spread">
            <strong>Module {m.id} · {m.title_fr} <span className={`badge ${m.tier === 'premium' ? 'gold' : ''}`}>{m.tier === 'premium' ? 'Premium' : 'Gratuit'}</span></strong>
            <Button onClick={() => toggle('modules', m.id, !m.published)}>{m.published ? 'Dépublier' : 'Publier'}</Button>
          </div>
          <table className="t" style={{ marginTop: '.5rem' }}>
            <tbody>
              {lessons.data!.filter((l) => l.module_id === m.id).map((l) => (
                <tr key={l.id}>
                  <td>{l.position}</td><td>{l.title_fr} <span className="small muted">({l.id})</span></td>
                  <td>{l.published ? 'Publiée' : <span className="badge gray">Brouillon</span>}</td>
                  <td className="row"><Button onClick={() => setEditing(l.id)}>Modifier</Button><Button variant="ghost" onClick={() => toggle('lessons', l.id, !l.published)}>{l.published ? 'Dépublier' : 'Publier'}</Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      ))}
      <Card>
        <h2>Ajouter un module</h2>
        <div className="grid2">
          <input type="number" placeholder="Numéro (ex. 9)" value={newModule.id} onChange={(e) => setNewModule({ ...newModule, id: e.target.value })} aria-label="Numéro du module" />
          <input type="text" placeholder="Titre" value={newModule.title} onChange={(e) => setNewModule({ ...newModule, title: e.target.value })} aria-label="Titre du module" />
          <select value={newModule.tier} onChange={(e) => setNewModule({ ...newModule, tier: e.target.value })} aria-label="Offre"><option value="premium">Premium</option><option value="free">Gratuit</option></select>
          <Button variant="primary" onClick={addModule}>Ajouter (brouillon)</Button>
        </div>
      </Card>
      <Card>
        <h2>Ajouter une leçon</h2>
        <div className="grid2">
          <input type="text" placeholder="Identifiant (ex. m9l1)" value={newLesson.id} onChange={(e) => setNewLesson({ ...newLesson, id: e.target.value.toLowerCase() })} aria-label="Identifiant" />
          <select value={newLesson.module} onChange={(e) => setNewLesson({ ...newLesson, module: e.target.value })} aria-label="Module"><option value="">Module…</option>{mods.data.map((m) => <option key={m.id} value={m.id}>{m.id}</option>)}</select>
          <input type="text" placeholder="Titre" value={newLesson.title} onChange={(e) => setNewLesson({ ...newLesson, title: e.target.value })} aria-label="Titre" />
          <Button variant="primary" onClick={addLesson}>Ajouter (brouillon)</Button>
        </div>
      </Card>
    </div>
  );
}

function LessonEditor({ id, onClose }: { id: string; onClose: () => void }) {
  const [meta, setMeta] = useState<LessonRow | null>(null);
  const [json, setJson] = useState('');
  const [errors, setErrors] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const { showToast } = useStore();
  useEffect(() => {
    Promise.all([
      q<LessonRow>(supabase!.from('lessons').select('*').eq('id', id).single()),
      q<{ content: unknown }>(supabase!.from('lesson_contents').select('content').eq('lesson_id', id).single()),
    ]).then(([m, c]) => { setMeta(m); setJson(JSON.stringify(c.content, null, 2)); }).catch((e) => setErrors([messageOf(e, 'load')]));
  }, [id]);

  async function save() {
    let content: { steps?: unknown[]; exercises?: Exercise[]; summary?: string[] };
    try {
      content = JSON.parse(json);
    } catch {
      return setErrors(['Le JSON est invalide (virgule ou guillemet manquant ?).']);
    }
    const errs = [
      ...(Array.isArray(content.steps) ? [] : ['« steps » doit être une liste.']),
      ...(Array.isArray(content.exercises) ? content.exercises.flatMap(validateExercise) : ['« exercises » doit être une liste.']),
      ...(Array.isArray(content.summary) ? [] : ['« summary » doit être une liste.']),
    ];
    if (errs.length) return setErrors(errs);
    setBusy(true);
    const r1 = await supabase!.from('lessons').update({ title_fr: meta!.title_fr, objective_fr: meta!.objective_fr, updated_at: new Date().toISOString() }).eq('id', id);
    const r2 = await supabase!.from('lesson_contents').update({ content, updated_at: new Date().toISOString() }).eq('lesson_id', id);
    setBusy(false);
    if (r1.error || r2.error) return setErrors([messageOf(r1.error ?? r2.error)]);
    setErrors([]);
    showToast('Leçon enregistrée');
  }

  if (!meta) return errors.length ? <ErrorState message={errors[0]!} /> : <Skeleton />;
  return (
    <Card>
      <div className="spread"><h2>Modifier {id}</h2><Button variant="ghost" onClick={onClose}>Fermer</Button></div>
      <div className="field"><label htmlFor="t">Titre</label><input id="t" type="text" value={meta.title_fr} onChange={(e) => setMeta({ ...meta, title_fr: e.target.value })} /></div>
      <div className="field"><label htmlFor="o">Objectif pédagogique</label><input id="o" type="text" value={meta.objective_fr} onChange={(e) => setMeta({ ...meta, objective_fr: e.target.value })} /></div>
      <div className="field">
        <label htmlFor="c">Contenu (étapes, exercices, résumé)</label>
        <textarea id="c" dir="auto" value={json} onChange={(e) => setJson(e.target.value)} spellCheck={false} />
        <p className="small muted">Les citations coraniques s’écrivent uniquement avec {'{ "kind": "quran", "ref": { "surah": 1, "ayah": 2 }, "fr": "…" }'} : le texte est lu dans la référence Tanzil, jamais saisi à la main.</p>
      </div>
      {errors.length > 0 && <div className="card err" role="alert"><ul style={{ margin: 0 }}>{errors.map((e, i) => <li key={i}>{e}</li>)}</ul></div>}
      <Button variant="primary" busy={busy} onClick={save}>Enregistrer</Button>
    </Card>
  );
}

type VocabRow = { id: string; arabic: string; transliteration: string; meaning_fr: string; root: string | null };
function VocabAdmin() {
  const { data, error, reload } = useQuery(() => q<VocabRow[]>(supabase!.from('vocabulary').select('id, arabic, transliteration, meaning_fr, root').order('id')));
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const { showToast } = useStore();
  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (!data) return <Skeleton />;
  async function save(id: string) {
    const { error } = await supabase!.from('vocabulary').update({ meaning_fr: drafts[id], updated_at: new Date().toISOString() }).eq('id', id);
    if (error) return showToast(messageOf(error));
    showToast('Traduction enregistrée'); reload();
  }
  return (
    <Card>
      <h2>Traductions du vocabulaire</h2>
      <table className="t"><thead><tr><th>Mot</th><th>Racine</th><th>Traduction française</th><th /></tr></thead>
        <tbody>{data.map((v) => (
          <tr key={v.id}>
            <td><span className="ar">{v.arabic}</span> <span className="small muted">{v.transliteration}</span></td>
            <td className="ar">{v.root ?? '—'}</td>
            <td><input type="text" aria-label={`Traduction de ${v.transliteration}`} value={drafts[v.id] ?? v.meaning_fr} onChange={(e) => setDrafts({ ...drafts, [v.id]: e.target.value })} /></td>
            <td>{drafts[v.id] !== undefined && drafts[v.id] !== v.meaning_fr && <Button onClick={() => save(v.id)}>Enregistrer</Button>}</td>
          </tr>
        ))}</tbody></table>
    </Card>
  );
}

function AudioAdmin() {
  const { data, error, reload } = useQuery(() => q<{ key: string; bucket: string; storage_path: string; speaker: string; license: string }[]>(supabase!.from('audio_assets').select('key, bucket, storage_path, speaker, license').order('key')));
  const [form, setForm] = useState({ key: '', bucket: 'audio-public', speaker: '', license: '', proof: '' });
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const { showToast } = useStore();

  async function upload() {
    if (!/^[a-z]+:[a-z0-9_-]+$/.test(form.key)) return setErr('Clé invalide (ex. letter:ba, word:kitab). La liste des clés attendues est dans docs/AUDIOS_A_ENREGISTRER.csv.');
    if (!file) return setErr('Choisissez un fichier audio.');
    if (!form.speaker || form.license.length < 4 || form.proof.length < 4) return setErr('Récitant, licence et preuve des droits sont obligatoires : seuls les enregistrements utilisables commercialement sont acceptés.');
    if (!/^audio\//.test(file.type) || file.size > 5_000_000) return setErr('Fichier audio de 5 Mo maximum attendu (m4a, mp3, ogg).');
    setBusy(true);
    setErr(null);
    const ext = file.name.split('.').pop()?.toLowerCase() ?? 'm4a';
    const path = `${form.key.replace(':', '/')}.${ext}`;
    const up = await supabase!.storage.from(form.bucket).upload(path, file, { upsert: true, contentType: file.type, cacheControl: '31536000' });
    if (up.error) { setBusy(false); return setErr(messageOf(up.error)); }
    const { error } = await supabase!.from('audio_assets').upsert({ key: form.key, bucket: form.bucket, storage_path: path, speaker: form.speaker, license: form.license, rights_proof: form.proof });
    setBusy(false);
    if (error) return setErr(messageOf(error));
    invalidateAudioAssets();
    showToast('Audio ajouté');
    setForm({ ...form, key: '' }); setFile(null); reload();
  }
  return (
    <div className="stack">
      <Card>
        <h2>Ajouter un enregistrement</h2>
        {err && <div className="card err" role="alert">{err}</div>}
        <div className="grid2">
          <div className="field"><label htmlFor="ak">Clé</label><input id="ak" type="text" placeholder="letter:ba" value={form.key} onChange={(e) => setForm({ ...form, key: e.target.value.trim() })} /></div>
          <div className="field"><label htmlFor="ab">Espace</label><select id="ab" value={form.bucket} onChange={(e) => setForm({ ...form, bucket: e.target.value })}><option value="audio-public">Public (modules 1 à 5)</option><option value="audio-premium">Premium (modules 6 à 8)</option></select></div>
          <div className="field"><label htmlFor="as">Récitant / voix</label><input id="as" type="text" value={form.speaker} onChange={(e) => setForm({ ...form, speaker: e.target.value })} /></div>
          <div className="field"><label htmlFor="al">Licence</label><input id="al" type="text" placeholder="Cession de droits, usage commercial" value={form.license} onChange={(e) => setForm({ ...form, license: e.target.value })} /></div>
          <div className="field"><label htmlFor="ap">Preuve des droits</label><input id="ap" type="text" placeholder="Référence du contrat signé" value={form.proof} onChange={(e) => setForm({ ...form, proof: e.target.value })} /></div>
          <div className="field"><label htmlFor="af">Fichier</label><input id="af" type="file" accept="audio/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} /></div>
        </div>
        <Button variant="primary" busy={busy} onClick={upload}>Téléverser</Button>
      </Card>
      <Card>
        <h2>Enregistrements ({data?.length ?? '…'})</h2>
        {error && <ErrorState message={error} onRetry={reload} />}
        {data && (data.length ? <table className="t"><thead><tr><th>Clé</th><th>Espace</th><th>Voix</th><th>Licence</th></tr></thead><tbody>{data.map((a) => <tr key={a.key}><td>{a.key}</td><td>{a.bucket}</td><td>{a.speaker}</td><td>{a.license}</td></tr>)}</tbody></table> : <p className="small muted">Aucun enregistrement. Les leçons affichent « Enregistrement bientôt disponible » en attendant.</p>)}
      </Card>
    </div>
  );
}

function UsersAdmin() {
  const [search, setSearch] = useState('');
  const { data, error, reload } = useQuery(() => q<{ id: string; email: string; created_at: string; last_sign_in_at: string | null; premium: boolean; roles: string[] }[]>(supabase!.rpc('admin_list_users', { p_search: search || null, p_limit: 100 })), [search]);
  return (
    <Card>
      <h2>Utilisateurs</h2>
      <input type="text" placeholder="Rechercher un e-mail" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Rechercher un e-mail" />
      {error && <ErrorState message={error} onRetry={reload} />}
      {!data && !error && <Skeleton lines={2} />}
      {data && (
        <table className="t" style={{ marginTop: '.75rem' }}><thead><tr><th>E-mail</th><th>Inscription</th><th>Dernière connexion</th><th>Premium</th><th>Rôles</th></tr></thead>
          <tbody>{data.map((u) => <tr key={u.id}><td>{u.email}</td><td>{new Date(u.created_at).toLocaleDateString('fr-FR')}</td><td>{u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleDateString('fr-FR') : '—'}</td><td>{u.premium ? 'Oui' : 'Non'}</td><td>{u.roles.join(', ')}</td></tr>)}</tbody></table>
      )}
      <p className="small muted">Les rôles administrateur s’attribuent en SQL (voir le guide de configuration), jamais depuis l’application.</p>
    </Card>
  );
}

function SubsAdmin() {
  const subs = useQuery(() => q<{ user_id: string; provider: string; status: string; current_period_end: string | null; cancel_at_period_end: boolean; updated_at: string }[]>(supabase!.from('subscriptions').select('user_id, provider, status, current_period_end, cancel_at_period_end, updated_at').order('updated_at', { ascending: false }).limit(100)));
  const events = useQuery(() => q<{ provider: string; type: string; received_at: string; error: string | null; processed_at: string | null }[]>(supabase!.from('payment_events').select('provider, type, received_at, error, processed_at').order('received_at', { ascending: false }).limit(50)));
  return (
    <div className="stack">
      <Card>
        <h2>Abonnements</h2>
        {subs.error && <ErrorState message={subs.error} onRetry={subs.reload} />}
        {subs.data && (subs.data.length ? <table className="t"><thead><tr><th>Utilisateur</th><th>Source</th><th>Statut</th><th>Fin de période</th></tr></thead>
          <tbody>{subs.data.map((s, i) => <tr key={i}><td className="small">{s.user_id.slice(0, 8)}…</td><td>{s.provider}</td><td>{s.status}{s.cancel_at_period_end ? ' (résilié)' : ''}</td><td>{s.current_period_end ? new Date(s.current_period_end).toLocaleDateString('fr-FR') : '—'}</td></tr>)}</tbody></table>
          : <p className="small muted">Aucun abonnement.</p>)}
      </Card>
      <Card>
        <h2>Derniers événements de paiement</h2>
        {events.data && (events.data.length ? <table className="t"><thead><tr><th>Date</th><th>Source</th><th>Type</th><th>État</th></tr></thead>
          <tbody>{events.data.map((e, i) => <tr key={i}><td>{new Date(e.received_at).toLocaleString('fr-FR')}</td><td>{e.provider}</td><td>{e.type}</td><td>{e.processed_at ? 'traité' : e.error ? `erreur : ${e.error}` : 'en attente'}</td></tr>)}</tbody></table>
          : <p className="small muted">Aucun événement reçu.</p>)}
      </Card>
    </div>
  );
}

function PriceAdmin() {
  const { data, reload } = useQuery(() => q<{ value: { display: string; amount_cents: number; stripe_price_id: string | null } }>(supabase!.from('app_settings').select('value').eq('key', 'premium_price').single()));
  const [euros, setEuros] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  async function save() {
    const cents = Math.round(Number(euros.replace(',', '.')) * 100);
    if (!Number.isFinite(cents) || cents < 100) return setMsg('Indiquez un prix valide (au moins 1 €).');
    setBusy(true);
    setMsg(null);
    const { error } = await supabase!.functions.invoke('admin-set-price', { body: { amount_cents: cents } });
    setBusy(false);
    if (error) return setMsg('Le prix n’a pas pu être modifié (vérifiez la configuration Stripe).');
    setMsg('Nouveau prix enregistré. Il s’applique aux nouveaux abonnements web.');
    reload();
  }
  return (
    <Card>
      <h2>Prix de l’abonnement annuel</h2>
      <p>Prix actuel (web) : <strong>{data?.value.display ?? '…'}</strong> {data && !data.value.stripe_price_id && <span className="badge gray">Stripe non configuré</span>}</p>
      <div className="field"><label htmlFor="eur">Nouveau prix annuel TTC (€)</label><input id="eur" type="text" inputMode="decimal" placeholder="39,99" value={euros} onChange={(e) => setEuros(e.target.value)} /></div>
      <Button variant="primary" busy={busy} onClick={save}>Enregistrer le prix</Button>
      {msg && <p role="status" style={{ marginTop: '.75rem' }}>{msg}</p>}
      <p className="small muted" style={{ marginTop: '.75rem' }}>Les abonnés existants conservent leur prix. Sur iPhone et Android, le prix se règle dans App Store Connect et la Google Play Console (règles des boutiques).</p>
    </Card>
  );
}
