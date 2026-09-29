-- ================================================================
-- CFM Maranatha — Etapa 5: nomes sempre padronizados
--
-- "BIANCA ROSSANE ALENCAR QUEIROZ" → "Bianca Rossane Alencar Queiroz"
-- "jessica portella freitas"       → "Jessica Portella Freitas"
-- "JOSÉ DA SILVA"                  → "José da Silva"
--
-- Regras:
--   - cada palavra com a primeira letra maiúscula e o resto minúsculo;
--   - de, da, do, das, dos, di, du, e → minúsculas (exceto no começo);
--   - palavra já escrita misturada (ex.: "McDonald") fica como está.
--
-- Como usar: no Supabase, abra "SQL Editor", cole este arquivo
-- inteiro e clique em "Run". Pode rodar mais de uma vez sem problema.
-- No final aparece um TESTE: confira se o resultado ficou certo.
-- ================================================================

create or replace function public.normalizar_nome(nome text)
returns text
language plpgsql
immutable
set search_path = ''
as $$
declare
  palavra text;
  baixa text;
  resultado text[] := '{}';
  posicao int := 0;
begin
  if nome is null then
    return null;
  end if;

  foreach palavra in array regexp_split_to_array(btrim(regexp_replace(nome, '\s+', ' ', 'g')), ' ') loop
    posicao := posicao + 1;
    baixa := lower(palavra);
    if posicao > 1 and baixa in ('da', 'das', 'de', 'di', 'do', 'dos', 'du', 'e') then
      resultado := resultado || baixa;
    elsif palavra <> upper(palavra) and palavra <> baixa then
      resultado := resultado || palavra;               -- misturada de propósito: mantém
    else
      resultado := resultado || initcap(baixa);        -- "maria-clara" → "Maria-Clara"
    end if;
  end loop;

  return array_to_string(resultado, ' ');
end;
$$;

-- Aplica sozinho sempre que um nome for salvo (cadastro, Google, edição)
create or replace function public.padronizar_nome_perfil()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.nome_completo = public.normalizar_nome(new.nome_completo);
  return new;
end;
$$;

drop trigger if exists perfis_padronizar_nome on public.perfis;
create trigger perfis_padronizar_nome
  before insert or update of nome_completo on public.perfis
  for each row execute function public.padronizar_nome_perfil();

-- Corrige os nomes que já estão salvos
update public.perfis
set nome_completo = public.normalizar_nome(nome_completo)
where nome_completo is distinct from public.normalizar_nome(nome_completo);

-- TESTE: o resultado deve ser exatamente "José da Silva Ávila de Souza e Castro"
select public.normalizar_nome('JOSÉ DA SILVA ÁVILA DE SOUZA E CASTRO') as teste;
