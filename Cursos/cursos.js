/* ================================================================
   CURSOS DO CENTRO DE FORMAÇÃO MINISTERIAL MARANATHA
   ================================================================

   Este é o ÚNICO arquivo que você precisa editar para adicionar
   cursos, módulos e aulas. Tudo o que está aqui aparece no site.

   COMO FUNCIONA (em palavras simples):
   - Um CURSO tem vários MÓDULOS (as "partes" do curso).
   - Cada MÓDULO tem várias AULAS.
   - Cada AULA pode ter um vídeo do YouTube, um texto e materiais (PDFs, links).

   REGRAS IMPORTANTES:
   1. Todo texto fica entre aspas "assim" ou, se for longo, entre crases `assim`.
   2. Depois de cada item vem uma vírgula , (exceto às vezes no último — tanto faz).
   3. O "id" é o "apelido" do curso/aula no endereço do site: use só letras
      minúsculas sem acento, números e hífen. Ex.: "vida-de-oracao"
      Nunca repita o mesmo id dentro do mesmo curso.
   4. status: "disponivel" (aparece para os alunos) ou "em-breve" (aparece bloqueado).

   VÍDEOS:
   - Suba o vídeo no YouTube (pode ser como "Não listado", assim ele só
     aparece aqui na plataforma e não na busca do YouTube).
   - Copie o link do vídeo e cole no campo video. Ex.:
       video: "https://www.youtube.com/watch?v=XXXXXXXXXXX",
   - Se ainda não tiver vídeo, deixe  video: ""  — o site mostra "Vídeo em breve".

   TEXTO DA AULA (campo texto):
   - Linha em branco separa parágrafos.
   - **palavra** fica em negrito.
   - Linhas começando com "- " viram uma lista.
   - Linha começando com "## " vira um subtítulo.

   ----------------------------------------------------------------
   MODELO PARA COPIAR (um curso completo):

   {
     id: "nome-do-curso",
     titulo: "Nome do Curso",
     resumo: "Uma frase curta que aparece no card do curso.",
     descricao: `Texto maior explicando o curso.

   Pode ter vários parágrafos.`,
     professor: "Pr. Fulano",
     cargaHoraria: "4 horas",
     status: "disponivel",
     capa: "",   // opcional: caminho de uma imagem, ex.: "Cursos/capas/meu-curso.jpg"
     voceVaiAprender: ["Primeiro ponto", "Segundo ponto"],
     paraQuem: "Para quem é este curso.",
     modulos: [
       {
         titulo: "Módulo 1 — Nome do módulo",
         aulas: [
           {
             id: "aula-1",
             titulo: "Título da aula",
             duracao: "15 min",
             video: "https://www.youtube.com/watch?v=XXXXXXXXXXX",
             texto: `Texto da aula aqui.`,
             materiais: [
               { nome: "Apostila (PDF)", link: "https://link-do-arquivo" }
             ]
           }
         ]
       }
     ]
   },
   ================================================================ */

window.CURSOS = [

  /* ---------- CURSO DE EXEMPLO (pode editar ou apagar) ---------- */
  {
    id: "boas-vindas",
    titulo: "Boas-vindas ao CFM",
    resumo: "Conheça o Centro de Formação Ministerial e aprenda a usar a plataforma.",
    descricao: `Este é um curso de exemplo para mostrar como a plataforma funciona. Ele pode ser editado ou apagado no arquivo **Cursos/cursos.js** assim que os primeiros cursos de verdade estiverem prontos.

Aqui vai o texto de apresentação do curso: o objetivo, o que o aluno vai estudar e como as aulas estão organizadas.`,
    professor: "Equipe CFM",
    cargaHoraria: "30 min",
    status: "disponivel",
    capa: "",
    voceVaiAprender: [
      "O que é o Centro de Formação Ministerial",
      "Como assistir às aulas e marcar seu progresso",
      "Como aproveitar melhor os estudos"
    ],
    paraQuem: "Para todos que desejam estudar no CFM: membros, líderes e visitantes.",
    modulos: [
      {
        titulo: "Módulo 1 — Começando",
        aulas: [
          {
            id: "bem-vindo",
            titulo: "Seja bem-vindo!",
            duracao: "5 min",
            video: "",
            texto: `Que alegria ter você aqui! O **Centro de Formação Ministerial Maranatha** nasceu para ajudar cada pessoa a crescer no conhecimento da Palavra e a servir com excelência.

## O que você vai encontrar
- Cursos gratuitos, organizados em módulos e aulas
- Vídeos e textos de apoio em cada aula
- Materiais para baixar, quando houver

Quando terminar esta aula, clique em **Marcar como concluída** e siga para a próxima.`,
            materiais: []
          },
          {
            id: "como-usar",
            titulo: "Como usar a plataforma",
            duracao: "5 min",
            video: "",
            texto: `Cada curso é dividido em **módulos**, e cada módulo tem suas **aulas**.

Na página da aula, você assiste ao vídeo, lê o texto de apoio e, ao final, marca a aula como concluída. A lista ao lado mostra onde você está e o que já concluiu.

Seu progresso fica salvo neste aparelho. Se você abrir em outro celular ou computador, o progresso começa do zero.`,
            materiais: []
          }
        ]
      },
      {
        titulo: "Módulo 2 — Estudando bem",
        aulas: [
          {
            id: "dicas-de-estudo",
            titulo: "Dicas para aproveitar os estudos",
            duracao: "10 min",
            video: "",
            texto: `Algumas dicas simples fazem muita diferença:

- Separe um horário fixo na semana para estudar
- Tenha a Bíblia e um caderno por perto
- Ore antes de cada aula
- Converse com seu líder sobre o que aprendeu`,
            materiais: []
          },
          {
            id: "proximos-passos",
            titulo: "Próximos passos",
            duracao: "10 min",
            video: "",
            texto: `Parabéns por chegar até aqui! Agora é só escolher um curso na página inicial e começar.

Novos cursos e aulas são adicionados aos poucos. Acompanhe as novidades no Instagram **@cc.maranatha**.`,
            materiais: []
          }
        ]
      }
    ]
  },

  /* ---------- CURSOS "EM BREVE" DE EXEMPLO (troque pelos nomes reais) ---------- */
  {
    id: "fundamentos-da-fe",
    titulo: "Fundamentos da Fé",
    resumo: "As bases da vida cristã: salvação, Palavra, oração e comunhão.",
    descricao: `Descrição do curso — edite em Cursos/cursos.js.`,
    professor: "",
    cargaHoraria: "",
    status: "em-breve",
    capa: "",
    modulos: []
  },
  {
    id: "lideranca-crista",
    titulo: "Liderança Cristã",
    resumo: "Princípios bíblicos para liderar e servir no Reino de Deus.",
    descricao: `Descrição do curso — edite em Cursos/cursos.js.`,
    professor: "",
    cargaHoraria: "",
    status: "em-breve",
    capa: "",
    modulos: []
  }

];
