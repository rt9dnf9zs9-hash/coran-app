import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, TextInput } from 'react-native';
import { Btn, C, Card, s, T } from '../components/ui';
import { supabase } from '../lib/supabase';

const input = { borderWidth: 1, borderColor: C.border, borderRadius: 12, minHeight: 48, paddingHorizontal: 12, backgroundColor: '#fff', fontSize: 16 } as const;

export default function Auth() {
  const [mode, setMode] = useState<'login' | 'signup' | 'reset'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  if (!supabase) return <ScrollView style={s.screen} contentContainerStyle={s.content}><Card><T>Les comptes ne sont pas configurés dans cette version.</T></Card></ScrollView>;

  async function submit() {
    if (!/^\S+@\S+\.\S+$/.test(email)) return setMsg({ ok: false, text: 'Entrez une adresse e-mail valide.' });
    if (mode !== 'reset' && password.length < 8) return setMsg({ ok: false, text: 'Le mot de passe doit contenir au moins 8 caractères.' });
    setBusy(true);
    setMsg(null);
    const sb = supabase!;
    const res = mode === 'login' ? await sb.auth.signInWithPassword({ email, password })
      : mode === 'signup' ? await sb.auth.signUp({ email, password })
      : await sb.auth.resetPasswordForEmail(email);
    setBusy(false);
    if (res.error) return setMsg({ ok: false, text: /invalid login/i.test(res.error.message) ? 'E-mail ou mot de passe incorrect.' : /not confirmed/i.test(res.error.message) ? 'Confirmez d’abord votre adresse e-mail.' : 'Opération impossible. Réessayez.' });
    if (mode === 'login') return router.back();
    setMsg({ ok: true, text: mode === 'signup' ? 'Compte créé : confirmez votre adresse via l’e-mail reçu, puis connectez-vous.' : 'Si un compte existe, un e-mail de réinitialisation a été envoyé.' });
  }

  return (
    <ScrollView style={s.screen} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
      <T size={22} bold>{mode === 'login' ? 'Se connecter' : mode === 'signup' ? 'Créer un compte' : 'Mot de passe oublié'}</T>
      {msg && <Card tone={msg.ok ? 'soft' : 'err'}><T>{msg.text}</T></Card>}
      <TextInput style={input} placeholder="nom@exemple.fr" keyboardType="email-address" autoCapitalize="none" autoComplete="email" value={email} onChangeText={setEmail} accessibilityLabel="Adresse e-mail" />
      {mode !== 'reset' && <TextInput style={input} placeholder="Mot de passe" secureTextEntry autoComplete={mode === 'login' ? 'password' : 'new-password'} value={password} onChangeText={setPassword} accessibilityLabel="Mot de passe" />}
      <Btn variant="primary" busy={busy} title="Valider" onPress={submit} />
      {mode !== 'login' && <Btn title="J’ai déjà un compte" onPress={() => setMode('login')} />}
      {mode !== 'signup' && <Btn title="Créer un compte" onPress={() => setMode('signup')} />}
      {mode === 'login' && <Btn title="Mot de passe oublié" onPress={() => setMode('reset')} />}
      <T size={13} muted>Nous enregistrons votre progression pour la synchroniser entre vos appareils. Pas de publicité, pas de revente de données.</T>
    </ScrollView>
  );
}
