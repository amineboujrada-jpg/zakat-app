-- Zakat : schéma de la base Supabase
-- Une table générique : chaque ligne = un élément de l'appli (compte, prêt, versement, dette, réglages) d'un utilisateur.

create table if not exists public.zakat_entries (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  store text not null check (store in ('accounts','loans','payments','debts','settings')),
  id text not null,
  data jsonb not null default '{}'::jsonb,
  deleted boolean not null default false,          -- suppression gardée pour prévenir les autres appareils
  updated_at timestamptz not null default now(),   -- heure serveur, sert à la synchro
  primary key (user_id, store, id)
);
create index if not exists zakat_entries_user_updated on public.zakat_entries (user_id, updated_at);

-- Sécurité : chacun ne voit et ne modifie que ses propres données
alter table public.zakat_entries enable row level security;
create policy "lire ses donnees" on public.zakat_entries for select to authenticated using (user_id = (select auth.uid()));
create policy "ajouter ses donnees" on public.zakat_entries for insert to authenticated with check (user_id = (select auth.uid()));
create policy "modifier ses donnees" on public.zakat_entries for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "supprimer ses donnees" on public.zakat_entries for delete to authenticated using (user_id = (select auth.uid()));
revoke all on public.zakat_entries from anon;
grant select, insert, update, delete on public.zakat_entries to authenticated;

-- Heure de modification unique et fixée par le serveur
create or replace function public.zakat_entries_touch() returns trigger language plpgsql
set search_path = '' as $$
begin new.updated_at := clock_timestamp(); return new; end $$;
create trigger zakat_entries_touch before insert or update on public.zakat_entries
for each row execute function public.zakat_entries_touch();
