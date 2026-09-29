# Guia: e-mails da plataforma (em português)

Os e-mails são as mensagens automáticas que a plataforma envia, como a de **"Esqueci minha senha"**.

## Por que isso é necessário

O serviço de e-mail que vem de graça no Supabase:
- só entrega e-mails para **membros da equipe do projeto no Supabase** (os alunos **não recebem nada**);
- envia no máximo **2 e-mails por hora**;
- manda as mensagens **em inglês**.

A solução gratuita é enviar os e-mails por uma **conta Gmail da igreja**. O Gmail permite cerca de **500 e-mails por dia**, e as mensagens raramente caem no spam.

Tempo estimado: **15 minutos**.

---

## Parte 1 — Preparar a conta Gmail

Use uma conta Gmail **da igreja ou do CFM** (ex.: `cfm.maranatha@gmail.com`), não uma conta pessoal. É esse endereço que os alunos vão ver como remetente.

1. Entre na conta Gmail e acesse **https://myaccount.google.com/security**.
2. Ative a **Verificação em duas etapas**, se ainda não estiver ativa. O Google exige isso para o próximo passo.
3. Acesse **https://myaccount.google.com/apppasswords**.
4. Em "Nome do app", escreva `Supabase CFM` e clique em **Criar**.
5. O Google mostra uma **senha de 16 letras**. Copie e guarde para a Parte 2.

> ⛔ Essa senha dá acesso para enviar e-mails pela conta. **Não envie para ninguém**, nem para mim. Você mesmo vai colar direto no Supabase.

## Parte 2 — Ligar o Gmail no Supabase

1. No Supabase, vá em **Authentication → Emails → SMTP Settings** (ou **Project Settings → Authentication → SMTP**).
2. Ligue a opção **Enable Custom SMTP** e preencha:

| Campo | O que colocar |
|---|---|
| Sender email | o e-mail do Gmail da igreja |
| Sender name | `CFM Maranatha` |
| Host | `smtp.gmail.com` |
| Port | `465` |
| Username | o e-mail do Gmail da igreja (completo) |
| Password | a senha de 16 letras da Parte 1 |
| Minimum interval | `10` (segundos) |

3. Clique em **Save**.
4. Em **Authentication → Rate Limits**, aumente **"Rate limit for sending emails"** para `100` por hora e salve.

## Parte 3 — Colar os modelos em português

1. Vá em **Authentication → Emails → Templates**.
2. Para cada modelo da lista abaixo:
   - abra o arquivo correspondente desta pasta (`supabase/emails/`) no Bloco de Notas;
   - copie o **assunto** que está na primeira linha do arquivo (depois de "ASSUNTO") e cole no campo **Subject**;
   - copie **o arquivo inteiro** e cole no campo do corpo da mensagem (**Message body**, na aba "Source");
   - clique em **Save**.

| Modelo no Supabase | Arquivo | Usado quando |
|---|---|---|
| **Reset Password** | `1-recuperar-senha.html` | "Esqueci minha senha" (**o mais importante**) |
| Confirm signup | `2-confirmar-cadastro.html` | só se um dia ligarem a confirmação de e-mail |
| Magic Link | `3-link-de-acesso.html` | entrar por link (não usado hoje) |
| Change Email Address | `4-trocar-email.html` | quando alguém troca o e-mail da conta |
| Invite user | `5-convite.html` | convite enviado pelo painel do Supabase |
| Reauthentication | `6-codigo-de-confirmacao.html` | código de confirmação |

Se aparecerem outros modelos na lista (por exemplo, avisos de segurança), podem ficar como estão.

## Parte 4 — Testar

1. Saia da sua conta no site.
2. Clique em **Entrar → Esqueci minha senha** e digite um e-mail que **não** seja da equipe do Supabase (ex.: o de um familiar, com permissão).
3. O e-mail deve chegar em português, com o logo da igreja, vindo do Gmail da igreja.
4. Clique no botão **no mesmo aparelho** e crie a nova senha.

Se o e-mail não chegar em alguns minutos, confira a caixa de spam e revise a Parte 2 (principalmente a senha de 16 letras e a porta 465).
