# Centro de Formação Ministerial Maranatha

Plataforma online e **gratuita** de cursos da Comunidade de Cristo Maranatha.

O site é simples de propósito: não tem banco de dados, nem servidor, nem mensalidade. São só alguns arquivos que o GitHub hospeda de graça (o nome desse serviço é **GitHub Pages**).

---

## O que tem em cada pasta

| Arquivo / pasta | Para que serve | Precisa mexer? |
|---|---|---|
| `Cursos/cursos.js` | **Todo o conteúdo**: cursos, módulos, aulas, vídeos e textos | ✅ Sim, é aqui que você trabalha |
| `index.html` | A "casca" do site (topo, rodapé) | Raramente |
| `assets/style.css` | Cores, fontes e aparência | Só para mudar o visual |
| `assets/app.js` | O funcionamento do site (telas) | Não |
| `assets/conta.js` | Login de alunos e progresso salvo na conta | Não |
| `assets/config.js` | Endereço e chave pública do Supabase | Só na configuração inicial |
| `supabase/` | Script do banco de dados e **guia de configuração do login** | Seguir o guia uma vez |
| `assets/logo.png` | Logo da igreja | Trocar pela versão oficial em alta qualidade |

---

## Como adicionar uma aula nova

1. Suba o vídeo no **YouTube**. Dica: escolha a visibilidade **"Não listado"**, assim o vídeo só aparece aqui na plataforma e não na busca do YouTube.
2. Abra o arquivo `Cursos/cursos.js`.
3. Encontre o curso e o módulo onde a aula vai entrar.
4. Copie uma aula que já existe e cole logo abaixo dela (não esqueça a vírgula entre uma aula e outra).
5. Troque os dados:
   - `id`: apelido da aula, sem espaço e sem acento (ex.: `"vida-de-oracao"`)
   - `titulo`: nome da aula
   - `duracao`: ex.: `"20 min"`
   - `video`: cole o link do YouTube
   - `texto`: o texto de apoio da aula
   - `materiais`: links de PDFs ou apostilas (pode deixar vazio: `[]`)
6. Salve e envie o arquivo para o GitHub (veja abaixo).

No topo do `cursos.js` tem um **modelo completo** de curso pronto para copiar.

### Liberar um curso "Em breve"
Troque `status: "em-breve"` por `status: "disponivel"` e adicione pelo menos uma aula.

### Escrever o texto da aula
- Uma **linha em branco** separa os parágrafos
- `**palavra**` fica em **negrito**
- Linhas começando com `- ` viram uma lista
- Linha começando com `## ` vira um subtítulo

---

## Como ver o site no computador

Dê dois cliques no arquivo `index.html`. O site abre no navegador.

> Os vídeos do YouTube podem não tocar quando o site é aberto assim, direto do computador. Depois de publicado no GitHub, funcionam normalmente.

---

## Como publicar o site (grátis, pelo GitHub Pages)

Faça isso **uma vez só**:

1. Entre no repositório: https://github.com/ComunidadeDeCristoMaranatha/CentroDeFormacaoMinisterialMaranatha
2. Clique em **Add file → Upload files** e arraste **todos os arquivos e pastas** deste projeto. Clique em **Commit changes**.
3. Vá em **Settings → Pages**.
4. Em **Source**, escolha **Deploy from a branch**. Em **Branch**, escolha `main` e a pasta `/ (root)`. Clique em **Save**.
5. Em 1 a 2 minutos o site fica no ar em:
   **https://comunidadedecristomaranatha.github.io/CentroDeFormacaoMinisterialMaranatha/**

> ⚠️ O GitHub Pages grátis só funciona com repositório **público**. Se o repositório estiver privado, mude em **Settings → General → Danger Zone → Change visibility**. Não tem problema: o conteúdo do site já é público de qualquer forma.

**Para atualizar depois:** repita o passo 2 só com o arquivo que mudou (normalmente `Cursos/cursos.js`), ou edite direto no site do GitHub clicando no arquivo e no ícone de lápis ✏️.

Para facilitar o dia a dia, dá para instalar o **GitHub Desktop** (programa gratuito), que sincroniza a pasta do computador com o GitHub em um clique.

---

## Como funciona o progresso do aluno

As aulas são abertas para todos, sem precisar de conta. O aluno marca as aulas como concluídas e o site lembra onde ele parou:

- **Sem conta:** o progresso fica salvo só no navegador daquele aparelho.
- **Com conta** (Google ou e-mail e senha): o progresso fica salvo na conta e aparece em qualquer aparelho. O que ele marcou antes de entrar é levado junto para a conta.

O login usa o **Supabase** (gratuito). Para ligar, siga o guia em [`supabase/GUIA-CONFIGURACAO.md`](supabase/GUIA-CONFIGURACAO.md). Enquanto `assets/config.js` estiver vazio, o site funciona sem login.

---

## Próximos passos possíveis

- [ ] Trocar o logo pela versão oficial em alta qualidade (`assets/logo.png`)
- [ ] Cadastrar os primeiros cursos de verdade e apagar o curso de exemplo
- [ ] Criar capas para os cursos (imagem 16:9, em `Cursos/capas/`)
- [x] Login de alunos (progresso salvo em qualquer aparelho): código pronto, falta configurar o Supabase
- [ ] Prova online (70% para aprovação, nova tentativa só com liberação do conselho)
- [ ] Painel do conselho
- [ ] Certificado de conclusão com código de validação
- [ ] Domínio próprio (ex.: `cfm.ccmaranatha.com.br`)
