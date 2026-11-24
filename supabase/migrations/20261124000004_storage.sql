-- Espaces de stockage audio.
-- audio-public  : audios des modules gratuits (lecture publique, mise en cache CDN).
-- audio-premium : audios des modules 6 à 8 (URL signées, réservées aux abonnés).
insert into storage.buckets (id, name, public) values
  ('audio-public', 'audio-public', true),
  ('audio-premium', 'audio-premium', false)
on conflict (id) do nothing;

create policy audio_public_read on storage.objects for select to anon, authenticated
  using (bucket_id = 'audio-public');

create policy audio_premium_read on storage.objects for select to authenticated
  using (bucket_id = 'audio-premium' and (public.has_premium(auth.uid()) or public.is_editor()));

create policy audio_editor_write on storage.objects for insert to authenticated
  with check (bucket_id in ('audio-public', 'audio-premium') and public.is_editor());
create policy audio_editor_update on storage.objects for update to authenticated
  using (bucket_id in ('audio-public', 'audio-premium') and public.is_editor());
create policy audio_editor_delete on storage.objects for delete to authenticated
  using (bucket_id in ('audio-public', 'audio-premium') and public.is_editor());
