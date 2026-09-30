-- ================================================================
-- CFM Maranatha — Etapa 9: prova final e certificado
--
-- Regras (tudo conferido AQUI no banco, não no navegador):
--   - Uma prova por curso; nota mínima (padrão 70%).
--   - O aluno recebe as perguntas SEM a resposta certa; a correção é feita aqui.
--   - Uma tentativa. Fechou a página no meio? Continua a MESMA prova.
--   - Nova tentativa só se o CONSELHO (ou admin) liberar.
--   - Antes da prova, o e-mail precisa estar validado (código de 6 números).
--   - Aprovado → certificado com código de validação (ex.: CFM-2026-7F3A9C).
--
-- Como usar: no Supabase, abra "SQL Editor", cole este arquivo
-- inteiro e clique em "Run". Pode rodar mais de uma vez sem problema.
-- ================================================================


-- ---------- E-mail validado ----------
alter table public.perfis add column if not exists email_verificado_em timestamptz;

-- Marca o e-mail como validado. Só funciona logo depois de a pessoa digitar
-- o código recebido por e-mail (o login por código fica registrado no token).
create or replace function public.marcar_email_verificado()
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  confirmado boolean;
begin
  if (select auth.uid()) is null then
    raise exception 'Entre na sua conta.';
  end if;
  select exists (
    select 1
    from jsonb_array_elements(coalesce(auth.jwt() -> 'amr', '[]'::jsonb)) a
    where a ->> 'method' in ('otp', 'magiclink', 'oauth')
      and (a ->> 'timestamp')::bigint > extract(epoch from now()) - 900
  ) into confirmado;
  if not confirmado then
    raise exception 'Digite o código enviado para o seu e-mail para confirmar.';
  end if;
  update public.perfis set email_verificado_em = now() where id = (select auth.uid());
  return now();
end;
$$;
revoke execute on function public.marcar_email_verificado() from public, anon;
grant execute on function public.marcar_email_verificado() to authenticated;


-- ---------- Tabelas ----------
create table if not exists public.provas (
  curso_id      text primary key check (char_length(curso_id) <= 100),
  curso_titulo  text not null,
  carga_horaria text,
  nota_minima   int not null default 70 check (nota_minima between 1 and 100),
  ativa         boolean not null default true
);

create table if not exists public.questoes (
  id           uuid primary key default gen_random_uuid(),
  curso_id     text not null references public.provas (curso_id) on delete cascade,
  ordem        int not null default 0,
  enunciado    text not null,
  alternativas jsonb not null check (jsonb_typeof(alternativas) = 'array' and jsonb_array_length(alternativas) between 2 and 6),
  correta      int not null check (correta >= 0)  -- posição da alternativa certa, começando em 0
);

create table if not exists public.tentativas (
  id          uuid primary key default gen_random_uuid(),
  usuario_id  uuid not null references auth.users (id) on delete cascade,
  curso_id    text not null,
  iniciada_em timestamptz not null default now(),
  enviada_em  timestamptz,
  respostas   jsonb,
  acertos     int,
  total       int,
  nota        int,
  aprovado    boolean
);
create index if not exists tentativas_aluno on public.tentativas (usuario_id, curso_id);

create table if not exists public.liberacoes_prova (
  id           uuid primary key default gen_random_uuid(),
  usuario_id   uuid not null references auth.users (id) on delete cascade,
  curso_id     text not null,
  motivo       text check (char_length(motivo) <= 300),
  liberado_por uuid default auth.uid() references auth.users (id) on delete set null,
  liberado_em  timestamptz not null default now(),
  usada_em     timestamptz
);

create table if not exists public.certificados (
  codigo        text primary key,
  usuario_id    uuid not null references auth.users (id) on delete cascade,
  curso_id      text not null,
  nome          text not null,
  curso_titulo  text not null,
  carga_horaria text,
  nota          int,
  emitido_em    timestamptz not null default now(),
  unique (usuario_id, curso_id)
);


-- ---------- Regras de acesso ----------
alter table public.provas enable row level security;
alter table public.questoes enable row level security;
alter table public.tentativas enable row level security;
alter table public.liberacoes_prova enable row level security;
alter table public.certificados enable row level security;

drop policy if exists "provas_ver" on public.provas;
create policy "provas_ver" on public.provas for select to anon, authenticated using (true);

-- Questões: ninguém lê direto (o gabarito fica protegido). Só pelas funções abaixo.

drop policy if exists "tentativas_ver" on public.tentativas;
create policy "tentativas_ver" on public.tentativas for select to authenticated
  using (usuario_id = (select auth.uid()) or public.eh_conselho());

drop policy if exists "liberacoes_ver" on public.liberacoes_prova;
create policy "liberacoes_ver" on public.liberacoes_prova for select to authenticated
  using (usuario_id = (select auth.uid()) or public.eh_conselho());

drop policy if exists "certificados_ver" on public.certificados;
create policy "certificados_ver" on public.certificados for select to authenticated
  using (usuario_id = (select auth.uid()) or public.eh_conselho());

revoke all on public.provas, public.questoes, public.tentativas, public.liberacoes_prova, public.certificados from anon, authenticated;
grant select on public.provas to anon, authenticated;
grant select on public.tentativas, public.liberacoes_prova, public.certificados to authenticated;


-- ---------- Situação da prova para o aluno ----------
create or replace function public.prova_situacao(p_curso text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  u uuid := (select auth.uid());
  pv record;
begin
  select * into pv from public.provas where curso_id = p_curso and ativa;
  if not found then
    return jsonb_build_object('existe', false);
  end if;
  return jsonb_build_object(
    'existe', true,
    'nota_minima', pv.nota_minima,
    'questoes', (select count(*) from public.questoes where curso_id = p_curso),
    'email_verificado', (select email_verificado_em is not null from public.perfis where id = u),
    'aprovado', exists (select 1 from public.tentativas where usuario_id = u and curso_id = p_curso and aprovado),
    'em_aberto', exists (select 1 from public.tentativas where usuario_id = u and curso_id = p_curso and enviada_em is null),
    'enviadas', (select count(*) from public.tentativas where usuario_id = u and curso_id = p_curso and enviada_em is not null),
    'ultima_nota', (select nota from public.tentativas where usuario_id = u and curso_id = p_curso and enviada_em is not null order by enviada_em desc limit 1),
    'liberacao', exists (select 1 from public.liberacoes_prova where usuario_id = u and curso_id = p_curso and usada_em is null),
    'certificado', (select codigo from public.certificados where usuario_id = u and curso_id = p_curso)
  );
end;
$$;
revoke execute on function public.prova_situacao(text) from public, anon;
grant execute on function public.prova_situacao(text) to authenticated;


-- ---------- Começar (ou continuar) a prova ----------
create or replace function public.iniciar_prova(p_curso text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  u uuid := (select auth.uid());
  pv record;
  t record;
  liberacao uuid;
begin
  if u is null then raise exception 'Entre na sua conta para fazer a prova.'; end if;
  select * into pv from public.provas where curso_id = p_curso and ativa;
  if not found then raise exception 'Este curso ainda não tem prova.'; end if;
  if (select email_verificado_em from public.perfis where id = u) is null then
    raise exception 'Valide o seu e-mail antes de fazer a prova.';
  end if;
  if exists (select 1 from public.tentativas where usuario_id = u and curso_id = p_curso and aprovado) then
    raise exception 'Você já foi aprovado(a) nesta prova.';
  end if;

  -- Prova começada e não enviada: continua a MESMA
  select * into t from public.tentativas
  where usuario_id = u and curso_id = p_curso and enviada_em is null
  order by iniciada_em desc limit 1;

  if not found then
    if exists (select 1 from public.tentativas where usuario_id = u and curso_id = p_curso and enviada_em is not null) then
      select id into liberacao from public.liberacoes_prova
      where usuario_id = u and curso_id = p_curso and usada_em is null
      order by liberado_em limit 1;
      if liberacao is null then
        raise exception 'Você já usou a sua tentativa. Uma nova tentativa só pode ser liberada pelo conselho.';
      end if;
      update public.liberacoes_prova set usada_em = now() where id = liberacao;
    end if;
    insert into public.tentativas (usuario_id, curso_id) values (u, p_curso) returning * into t;
  end if;

  return jsonb_build_object(
    'tentativa', t.id,
    'nota_minima', pv.nota_minima,
    'questoes', (
      -- ordem embaralhada, mas sempre igual dentro da mesma tentativa; SEM a resposta certa
      select coalesce(jsonb_agg(jsonb_build_object('id', q.id, 'enunciado', q.enunciado, 'alternativas', q.alternativas)
                                order by md5(q.id::text || t.id::text)), '[]'::jsonb)
      from public.questoes q where q.curso_id = p_curso
    )
  );
end;
$$;
revoke execute on function public.iniciar_prova(text) from public, anon;
grant execute on function public.iniciar_prova(text) to authenticated;


-- ---------- Enviar, corrigir e (se aprovado) emitir o certificado ----------
create or replace function public.enviar_prova(p_tentativa uuid, p_respostas jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  u uuid := (select auth.uid());
  t record;
  pv record;
  v_total int;
  v_acertos int;
  v_nota int;
  v_aprovado boolean;
  v_codigo text;
begin
  select * into t from public.tentativas where id = p_tentativa and usuario_id = u for update;
  if not found then raise exception 'Prova não encontrada.'; end if;
  if t.enviada_em is not null then raise exception 'Esta prova já foi enviada.'; end if;
  select * into pv from public.provas where curso_id = t.curso_id;

  select count(*),
         count(*) filter (where (p_respostas ->> q.id::text) ~ '^[0-9]+$' and (p_respostas ->> q.id::text)::int = q.correta)
    into v_total, v_acertos
  from public.questoes q where q.curso_id = t.curso_id;

  v_nota := round(v_acertos * 100.0 / greatest(v_total, 1));
  v_aprovado := v_nota >= pv.nota_minima;

  update public.tentativas
  set enviada_em = now(), respostas = p_respostas, acertos = v_acertos, total = v_total, nota = v_nota, aprovado = v_aprovado
  where id = t.id;

  if v_aprovado then
    insert into public.certificados (codigo, usuario_id, curso_id, nome, curso_titulo, carga_horaria, nota)
    values (
      'CFM-' || to_char(now() at time zone 'America/Fortaleza', 'YYYY') || '-' || upper(substr(md5(gen_random_uuid()::text), 1, 6)),
      u, t.curso_id,
      (select nome_completo from public.perfis where id = u),
      pv.curso_titulo, pv.carga_horaria, v_nota
    )
    on conflict (usuario_id, curso_id) do nothing;
    select codigo into v_codigo from public.certificados where usuario_id = u and curso_id = t.curso_id;
  end if;

  return jsonb_build_object('nota', v_nota, 'acertos', v_acertos, 'total', v_total,
                            'aprovado', v_aprovado, 'nota_minima', pv.nota_minima, 'certificado', v_codigo);
end;
$$;
revoke execute on function public.enviar_prova(uuid, jsonb) from public, anon;
grant execute on function public.enviar_prova(uuid, jsonb) to authenticated;


-- ---------- Conselho libera nova tentativa ----------
create or replace function public.liberar_nova_tentativa(p_usuario uuid, p_curso text, p_motivo text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.eh_conselho() then
    raise exception 'Somente o conselho ou a administração podem liberar uma nova tentativa.';
  end if;
  if exists (select 1 from public.liberacoes_prova where usuario_id = p_usuario and curso_id = p_curso and usada_em is null) then
    raise exception 'Essa pessoa já tem uma nova tentativa liberada e ainda não usou.';
  end if;
  insert into public.liberacoes_prova (usuario_id, curso_id, motivo) values (p_usuario, p_curso, p_motivo);
end;
$$;
revoke execute on function public.liberar_nova_tentativa(uuid, text, text) from public, anon;
grant execute on function public.liberar_nova_tentativa(uuid, text, text) to authenticated;


-- ---------- Validar certificado (qualquer pessoa, sem conta) ----------
create or replace function public.validar_certificado(p_codigo text)
returns table (codigo text, nome text, curso_titulo text, carga_horaria text, emitido_em timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select c.codigo, c.nome, c.curso_titulo, c.carga_horaria, c.emitido_em
  from public.certificados c
  where c.codigo = upper(btrim(p_codigo));
$$;
revoke execute on function public.validar_certificado(text) from public;
grant execute on function public.validar_certificado(text) to anon, authenticated;


-- ================================================================
-- PROVAS E PERGUNTAS DE EXEMPLO  ⚠️ trocar pelas perguntas reais
-- (as de exemplo começam com "[EXEMPLO]" e são recriadas a cada execução)
-- ================================================================
insert into public.provas (curso_id, curso_titulo) values
  ('integracao', 'Curso de Integração'),
  ('fundamentos-da-fe', 'Fundamentos da Fé'),
  ('curso-de-batismo', 'Curso de Batismo'),
  ('escola-de-salmistas', 'Escola de Salmistas')
on conflict (curso_id) do nothing;

delete from public.questoes where enunciado like '[EXEMPLO]%';

insert into public.questoes (curso_id, ordem, enunciado, alternativas, correta) values
  ('integracao', 1, '[EXEMPLO] O que significa a palavra "Maranata"?', '["O Senhor é bom", "O Senhor vem", "Paz do Senhor", "Deus é amor"]', 1),
  ('integracao', 2, '[EXEMPLO] Em que ano nasceu a Comunidade de Cristo Maranatha?', '["2005", "2009", "2011", "2015"]', 2),
  ('integracao', 3, '[EXEMPLO] No Grande Mandamento encontramos os propósitos de:', '["Missão e discipulado", "Adoração e ministério", "Comunhão e evangelismo", "Oração e jejum"]', 1),
  ('integracao', 4, '[EXEMPLO] Quais são as quatro estações dos Pequenos Grupos?', '["Cultivo, cuidado, crescimento e colheita", "Verão, outono, inverno e primavera", "Oração, leitura, jejum e culto", "Chamado, envio, serviço e descanso"]', 0),
  ('integracao', 5, '[EXEMPLO] O que significa a sigla GDP?', '["Grupo de Discípulos da Paz", "Grupo de Discipulado Pessoal", "Gestão de Pequenos grupos", "Grupo de Doutrina e Palavra"]', 1),

  ('fundamentos-da-fe', 1, '[EXEMPLO] Quantos livros tem a Bíblia (sem os apócrifos)?', '["39", "27", "66", "73"]', 2),
  ('fundamentos-da-fe', 2, '[EXEMPLO] A doutrina da Trindade afirma que:', '["Existem três deuses", "Há um só Deus em três pessoas", "Jesus não é Deus", "O Espírito Santo é uma força"]', 1),
  ('fundamentos-da-fe', 3, '[EXEMPLO] A morte substitutiva de Jesus em nosso lugar é chamada de:', '["Santificação", "Glorificação", "Expiação", "Adoção"]', 2),
  ('fundamentos-da-fe', 4, '[EXEMPLO] Segundo Gálatas 5:22-23, qual destes é parte do fruto do Espírito?', '["Riqueza", "Domínio próprio", "Fama", "Força física"]', 1),
  ('fundamentos-da-fe', 5, '[EXEMPLO] A justificação acontece:', '["Pelas nossas obras", "Pela fé em Jesus Cristo", "Pela frequência aos cultos", "Pelo batismo apenas"]', 1),

  ('curso-de-batismo', 1, '[EXEMPLO] Pergunta de exemplo 1: marque a alternativa B.', '["Alternativa A", "Alternativa B", "Alternativa C", "Alternativa D"]', 1),
  ('curso-de-batismo', 2, '[EXEMPLO] Pergunta de exemplo 2: marque a alternativa A.', '["Alternativa A", "Alternativa B", "Alternativa C", "Alternativa D"]', 0),
  ('curso-de-batismo', 3, '[EXEMPLO] Pergunta de exemplo 3: marque a alternativa D.', '["Alternativa A", "Alternativa B", "Alternativa C", "Alternativa D"]', 3),
  ('curso-de-batismo', 4, '[EXEMPLO] Pergunta de exemplo 4: marque a alternativa C.', '["Alternativa A", "Alternativa B", "Alternativa C", "Alternativa D"]', 2),
  ('curso-de-batismo', 5, '[EXEMPLO] Pergunta de exemplo 5: marque a alternativa B.', '["Alternativa A", "Alternativa B", "Alternativa C", "Alternativa D"]', 1),

  ('escola-de-salmistas', 1, '[EXEMPLO] Pergunta de exemplo 1: marque a alternativa C.', '["Alternativa A", "Alternativa B", "Alternativa C", "Alternativa D"]', 2),
  ('escola-de-salmistas', 2, '[EXEMPLO] Pergunta de exemplo 2: marque a alternativa A.', '["Alternativa A", "Alternativa B", "Alternativa C", "Alternativa D"]', 0),
  ('escola-de-salmistas', 3, '[EXEMPLO] Pergunta de exemplo 3: marque a alternativa B.', '["Alternativa A", "Alternativa B", "Alternativa C", "Alternativa D"]', 1),
  ('escola-de-salmistas', 4, '[EXEMPLO] Pergunta de exemplo 4: marque a alternativa D.', '["Alternativa A", "Alternativa B", "Alternativa C", "Alternativa D"]', 3),
  ('escola-de-salmistas', 5, '[EXEMPLO] Pergunta de exemplo 5: marque a alternativa A.', '["Alternativa A", "Alternativa B", "Alternativa C", "Alternativa D"]', 0);
