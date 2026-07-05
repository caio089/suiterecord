# Suiter Record — Auditoria de Código, Segurança e Produto

> Revisão técnica completa da extensão interna de gravação e transcrição de reuniões
> da Triforce Consultoria.
>
> **Stack:** React 19 · Vite · Express · Firebase/Firestore · Gemini —
> **Hospedagem:** Firebase / Cloud Run — **Origem:** Google AI Studio —
> **Data:** 05/07/2026

## Nível de risco geral: CRÍTICO

O banco de dados está aberto para leitura e escrita pública e as senhas são
armazenadas e exibidas em texto puro. É necessário agir antes de qualquer uso com
dados reais de cliente.

**Resumo em uma frase:** a interface é rica, bem organizada e visualmente polida,
mas toda a camada de segurança é apenas cosmética — qualquer pessoa com o endereço
do app pode ler e apagar todas as transcrições, extrair a lista completa de usuários
com senhas em texto puro e usar a chave do Gemini como proxy gratuito.

### Achados por severidade

| Severidade | Quantidade |
|------------|-----------|
| Crítico    | 5         |
| Alto       | 8         |
| Médio      | 9         |
| Baixo      | 6         |
| **Total**  | **28**    |

---

## 1. Segurança de dados

O aplicativo trata segurança como um comportamento de interface (esconder botões,
exigir uma senha na tela de login), mas nada disso é imposto no servidor ou no banco.
Todos os controles podem ser contornados pelo console do navegador ou por requisições
diretas.

### SEG-01 · Crítico · Firestore totalmente aberto para leitura e escrita pública

A regra é `allow read, write: if true;` (`firestore.rules:5`). Combinada com a config
pública do Firebase (`src/firebase.ts:14`) e o ID do banco, isso permite que qualquer
pessoa na internet leia, altere ou apague todas as coleções: `meetings` (transcrições
completas de clientes), `permitted_users` (e-mails + senhas) e `config` (token do
Suiter). Não há nenhuma barreira.

**Correção:** exigir autenticação (`request.auth != null`) e validar papéis por
coleção; escrita em `permitted_users` e `config` apenas para administradores.
Idealmente, mover toda escrita para trás de uma API autenticada (Cloud Function) e
deixar o cliente apenas ler o que lhe pertence.

### SEG-02 · Crítico · Senhas armazenadas e exibidas em texto puro

As senhas ficam em texto puro no Firestore e no `localStorage` (`App.tsx:812`,
`password: "admin"`), aparecem na tela de administração (`App.tsx:3994`) e — mais
grave — na própria tela de login, no botão "Ver Usuários Cadastrados", que lista todos
os e-mails com a respectiva senha *antes de qualquer autenticação* (`App.tsx:2091`).

**Correção:** nunca armazenar senhas próprias. Migrar para Firebase Authentication
(e-mail/senha ou apenas Google), que faz o hash e a gestão de credenciais. Remover
imediatamente o seletor de contas/senhas da tela de login.

### SEG-03 · Crítico · Autenticação e papéis são apenas do lado do cliente

O login compara e-mail/senha contra a lista em memória (`App.tsx:379`) e o estado
"autenticado" é só `localStorage.plaud_authenticated = "true"` (`App.tsx:387`).
Qualquer um pode definir isso no DevTools e entrar. Da mesma forma, as restrições de
administrador (excluir reunião, exportar para o Suiter) são apenas
`currentUser?.role === "Administrador"` no front-end — trocar o papel no `localStorage`
concede acesso total.

**Correção:** autorização real com custom claims do Firebase Auth verificados nas
regras do Firestore e nos endpoints. O cliente nunca deve ser a fonte de verdade sobre
identidade ou papel.

### SEG-04 · Crítico · Endpoints da API sem autenticação (proxy de Gemini e SSRF)

`/api/transcribe`, `/api/smart-search` e `/api/export-suiter` (`server.ts:44`) não
exigem nenhuma credencial. Qualquer pessoa pode chamá-los e consumir a cota do Gemini
livremente. Pior: `/api/export-suiter` faz `fetch()` para a `apiUrl` enviada no corpo
da requisição (`server.ts:304`) — um atacante pode apontar para endereços internos
(SSRF) usando o servidor como intermediário.

**Correção:** exigir token de sessão (Firebase ID token) em todos os endpoints,
validar no servidor, aplicar rate limiting e restringir os destinos de
`export-suiter` a uma allowlist de hosts.

### SEG-05 · Crítico · Redefinição de senha sem verificação → tomada de conta

"Esqueci minha senha" permite que qualquer visitante defina uma nova senha para
qualquer e-mail cadastrado, sem enviar e-mail nem validar token (`App.tsx:405`).
Somado ao Firestore aberto (SEG-01), é uma tomada de conta trivial de qualquer
usuário, inclusive administradores.

**Correção:** usar o fluxo `sendPasswordResetEmail` do Firebase Auth, que exige acesso
à caixa de e-mail do titular. Remover a redefinição local.

### SEG-06 · Alto · Login "Google" simulado permite entrar só com um e-mail

Quando a config do Firebase não está disponível, o botão do Google cai em um seletor
"simulado" (`App.tsx:475`) e em `handleManualSimulatedEmailSubmit` (`App.tsx:502`),
que autentica informando apenas um e-mail, sem senha nem verificação real com o
Google. É um desvio de autenticação.

**Correção:** remover totalmente o caminho simulado em produção; se o Google Auth não
inicializar, bloquear o login em vez de conceder acesso.

### SEG-07 · Alto · Token do Suiter fixo no código-fonte

Um Bearer token aparece embutido no código e no estado padrão
(`"suiter_token_live_2026_94f83b2a"`, `App.tsx:787`) e é gravado no Firestore aberto.
Mesmo sendo um valor de exemplo, o padrão vaza o token real assim que ele for
configurado.

**Correção:** guardar segredos apenas no servidor (variáveis de ambiente / Secret
Manager); o cliente nunca deve conhecer o token do Suiter.

### SEG-08 · Médio · Escopo do Google OAuth amplo demais

O login solicita `calendar` e `calendar.events` (leitura *e escrita*) (`App.tsx:363`),
mas o app só lê eventos. Escopos de escrita ampliam o impacto de qualquer vazamento de
token e dificultam a aprovação no processo de verificação do Google.

**Correção:** pedir apenas `calendar.readonly` / `calendar.events.readonly`.

---

## 2. Banco de dados e persistência

O modelo de sincronização reescreve o banco inteiro a cada alteração e não isola os
dados por usuário. Isso gera custo alto no Firestore e perda de dados quando duas
pessoas usam o app ao mesmo tempo.

### DB-01 · Alto · Cada alteração reescreve todas as reuniões (custo e quota)

O efeito de sincronização carrega todas as reuniões da nuvem, calcula diferença e
então regrava todos os documentos a cada mudança do array `meetings` (`App.tsx:880`).
Marcar uma única tarefa como concluída reescreve o histórico inteiro. Com N reuniões,
é O(N) escritas por interação — o mesmo vale para usuários (`App.tsx:908`). Sem
debounce.

**Correção:** gravar apenas o documento que mudou
(`setDoc(doc(db,"meetings",id), m)` do item alterado). Nunca varrer a coleção inteira
em cada render.

### DB-02 · Alto · Sobrescrita entre usuários (last-writer-wins global)

Como cada cliente escreve seu array local inteiro e só lê no carregamento, dois
usuários simultâneos se sobrescrevem. Se o usuário A apaga uma reunião, a sincronização
a remove da nuvem; o usuário B, que ainda a tem em memória, a recria (`App.tsx:887`).
Não há escopo por dono nem controle de concorrência.

**Correção:** escritas incrementais por documento + `onSnapshot` para estado em tempo
real; adicionar campo `ownerId`/`createdBy` e refletir no modelo.

### DB-03 · Médio · Sem escuta em tempo real; dados só chegam no reload

Os dados são lidos uma vez na montagem (`App.tsx:799`). Alterações feitas por outra
pessoa só aparecem ao recarregar a página, o que reforça o problema de sobrescrita
(DB-02).

**Correção:** substituir os `getDocs` únicos por assinaturas `onSnapshot`.

### DB-04 · Médio · Foto de perfil em base64 pode estourar o limite do documento

O upload de foto salva a imagem inteira em base64 dentro do documento do usuário e no
`localStorage` (`App.tsx:531`). Uma foto grande passa do limite de 1 MB por documento
do Firestore e faz a escrita falhar silenciosamente.

**Correção:** subir a imagem para o Firebase Storage e guardar apenas a URL;
redimensionar no cliente antes.

### DB-05 · Baixo · Chaves de armazenamento inconsistentes e verdade duplicada

Persistência dividida entre Firestore e `localStorage` com prefixos misturados
(`plaud_*` e `suiter_*`). O `currentUser` restaurado do `localStorage` não é
revalidado contra a lista de permitidos, então um usuário removido continua "logado"
naquele navegador (`App.tsx:275`).

**Correção:** uma única fonte de verdade (Firestore + Auth); usar o `localStorage` só
como cache e revalidar a sessão no carregamento.

---

## 3. Integração com o Google Agenda

A integração funciona para leitura básica, mas tem um bug de fuso horário no filtro por
dia e não trata a expiração do token de acesso de forma robusta.

### CAL-01 · Alto · Filtro de eventos por dia erra por fuso horário

Os eventos são agrupados por `new Date(startDateTime).toISOString().split("T")[0]`
(`App.tsx:3487`), que converte para UTC antes de comparar com a data local escolhida.
No horário de Brasília (−03:00), reuniões perto da meia-noite caem no dia UTC seguinte
e somem do filtro (ou aparecem no dia errado). O intervalo em `fetchRealEvents` usa
hora local (`App.tsx:567`), criando inconsistência.

**Correção:** comparar as datas no fuso local (ex.: usar componentes locais ou uma
biblioteca de data com timezone) de forma consistente entre a busca e o filtro.

### CAL-02 · Médio · Token de acesso expira sem renovação real

O `accessToken` obtido via `signInWithPopup` vive só na memória e dura ~1 hora
(`App.tsx:636`). Ao expirar, o app tenta reautenticar abrindo outro pop-up
(`App.tsx:679`), o que interrompe o fluxo. O SDK web não fornece refresh token.

**Correção:** intermediar o Google Calendar por um backend com refresh token, ou
detectar 401 e reautenticar de forma explícita e amigável.

### CAL-03 · Baixo · Só busca o calendário `primary`

A busca é fixa no calendário `primary` (`App.tsx:573`). Consultores com agendas
compartilhadas/secundárias não veem esses eventos.

**Correção:** listar calendários (`calendarList`) e permitir escolher a fonte.

---

## 4. Bugs de lógica

Vários defeitos concretos afetam o resultado visível — desde atas oficiais com nomes
inventados até o painel de logs do Suiter que aparece vazio.

### BUG-01 · Alto · Atas exportadas inventam participantes e decisões

Quando faltam dados, a interface e os PDFs/DOCX caem em nomes e decisões fixos
fabricados ("Luiz Silva", "Carlos Eduardo", "Mariana Dias" e três decisões genéricas)
— `App.tsx:1486`, `App.tsx:1516`, `App.tsx:2932`, `App.tsx:3990`. Uma "ata corporativa
oficial" pode sair com participantes que não estavam na reunião e decisões que nunca
ocorreram — risco sério de confiança e de conformidade.

**Correção:** nunca preencher com dados fictícios. Se não houver
participantes/decisões, mostrar "Não identificado" e omitir a seção no documento.

### BUG-02 · Alto · Modelo Gemini provavelmente inválido — transcrição sempre falha

O servidor chama `model: "gemini-3.5-flash"` (`server.ts:156` e `server.ts:214`). Esse
identificador não corresponde a um modelo Gemini publicado (a família usa nomes como
`gemini-2.5-flash`). Se o id estiver errado, toda gravação e busca real retornam erro,
restando apenas as reuniões de exemplo.

**Correção:** usar um id válido e atual (ex.: `gemini-2.5-flash`) e tratar o erro do
modelo de forma explícita para o usuário.

### BUG-03 · Médio · Prioridade da tarefa salva com valor quebrado

As opções do seletor de prioridade têm `value="Alta font-sans"` (`App.tsx:4914`) — uma
classe CSS colada por engano no valor. A prioridade gravada vira "Alta font-sans", que
não bate com as comparações `=== "Alta"` e quebra as cores dos selos na tela e nos
exports.

**Correção:** usar `value="Alta"`, `"Média"`, `"Baixa"`.

### BUG-04 · Médio · Painel de logs do Suiter renderiza campos inexistentes

A view "Integração Suiter" usa `key={log.id}` e mostra `log.details` (`App.tsx:4126`,
`App.tsx:4139`), mas os objetos de log criados em `exportMeetingToSuiter` não têm `id`
nem `details` — têm `request`/`response` (`App.tsx:1807`). Resultado: aviso de key no
React e caixas de detalhe vazias. O tipo `SuiterLog` em três lugares (blueprint,
`types.ts`, uso real) está divergente.

**Correção:** unificar a interface `SuiterLog` e renderizar os campos que realmente
existem (usar `request.body`/`response.body` ou dar um `id` ao log).

### BUG-05 · Médio · Simulação transcreve 1 segundo de silêncio

O "Simulador Completo Inteligente" envia um WAV de 1 segundo de silêncio ao Gemini
pedindo transcrição (`App.tsx:1206`). O modelo tende a alucinar conteúdo ou falhar, e a
ata resultante é fabricada a partir do nada — confuso e desperdiça chamadas de API.

**Correção:** se o objetivo é demonstrar, usar um conjunto de dados fixo local em vez
de chamar o modelo; deixar claro que é conteúdo de amostra.

### BUG-06 · Baixo · Limite de upload divergente e sem checagem no cliente

A interface diz "até 25 MB" (`App.tsx:3756`), o servidor aceita 50 MB (`server.ts:20`)
e não há validação de tamanho no cliente. Base64 infla ~33%, então arquivos grandes
falham sem mensagem clara. A duração é fixada em 120 s para uploads (`App.tsx:1333`),
distorcendo métricas.

**Correção:** alinhar os limites, validar o tamanho antes de enviar e estimar a
duração real do áudio.

### BUG-07 · Baixo · Fallback de gravação para `audio/wav` lança exceção

Se o navegador não suportar webm/ogg/mp4, o código cai em
`MediaRecorder(stream,{mimeType:"audio/wav"})` (`App.tsx:995`), formato que o
`MediaRecorder` geralmente não grava, lançando erro no início da gravação.

**Correção:** omitir o `mimeType` e deixar o navegador escolher o padrão suportado,
com verificação prévia.

---

## 5. UX / UI

O visual é forte e coeso, mas há classes de cor inválidas que degradam bordas em
silêncio, além de escolhas que prejudicam legibilidade, acessibilidade e cópia de
texto.

### UX-01 · Médio · Classes de cor inexistentes (zinc-650/750/850) não aplicam nada

O código usa dezenas de vezes `border-zinc-750`, `bg-zinc-850`, `border-zinc-650` etc.
A paleta padrão do Tailwind não tem os tons 650/750/850, então essas utilidades não
geram estilo no Tailwind v4 — bordas e fundos que deveriam existir simplesmente somem,
deixando cards "chapados".

**Correção:** usar tons válidos (700, 800) ou definir esses tons customizados no tema
do Tailwind (`@theme`).

### UX-02 · Médio · Transcrições não podem ser selecionadas nem copiadas

O `<body>` tem `select-none` e o viewport usa `user-scalable=no` (`index.html:5`,
`index.html:26`). O usuário não consegue selecionar/copiar trechos da transcrição nem
dar zoom — ruim para produtividade e acessibilidade.

**Correção:** restringir `select-none` a controles de UI e liberar seleção nas áreas de
conteúdo; remover `user-scalable=no`.

### UX-03 · Médio · Sem estado de carregamento inicial (flash de conteúdo de exemplo)

A tela abre com `INITIAL_MEETINGS` e depois troca pelos dados da nuvem quando
`isDbLoaded` fica verdadeiro (`App.tsx:687`), sem spinner intermediário. O usuário vê
reuniões de amostra "piscarem" antes dos dados reais.

**Correção:** mostrar um skeleton/spinner enquanto `isDbLoaded` for falso e só então
renderizar a lista.

### UX-04 · Baixo · Acessibilidade: fontes minúsculas, cor como único sinal, sem ARIA

Uso frequente de `text-[9px]`/`text-[10px]` com `zinc-500` sobre `zinc-950` tem
contraste baixo; status é comunicado só por cor (selos de prioridade); botões de ícone
sem `aria-label`.

**Correção:** mínimo de 12px em texto informativo, aumentar contraste, adicionar
rótulos e um segundo sinal além da cor.

### UX-05 · Baixo · Configuração do Suiter duplicada em dois lugares

Os mesmos campos (URL, token, modo simulação) existem na view "Integração Suiter" e no
painel lateral direito (`App.tsx:4054` e `App.tsx:4298`), podendo divergir e confundir
sobre qual salva de fato.

**Correção:** uma única tela de configuração reutilizada nos dois pontos de acesso.

---

## 6. Fluxo de trabalho e arquitetura

Observações estruturais sobre como o app se posiciona como extensão do Suiter e como o
código está organizado.

### ARQ-01 · Médio · Todo o app em um único componente de ~5.000 linhas

`App.tsx` concentra estado, lógica de negócio, chamadas de rede, exportação de PDF/DOCX
e toda a UI (`App.tsx:1`–`4971`). Isso dificulta manutenção, testes e reaproveitamento,
e aumenta a chance de bugs como os de tipo (BUG-04).

**Correção:** extrair views (Login, Histórico, Nova Reunião, Admin, Suiter), hooks
(`useMeetings`, `useCalendar`) e utilitários de export para módulos separados.

### ARQ-02 · Médio · Exportação para o Suiter é apenas simulada

O caminho padrão é o simulador (`isMock` verdadeiro por padrão, e qualquer URL
"interno" força mock — `server.ts:233`, `server.ts:271`). A integração real que dá
nome ao produto ("extensão do Suiter") ainda não está exercitada de ponta a ponta, sem
retentativa nem autenticação real.

**Correção:** definir e testar o contrato real da API do Suiter, com autenticação,
timeout, retentativa e idempotência (evitar duplicar reuniões já enviadas).

### ARQ-03 · Baixo · Reuniões são globais, sem noção de dono

Todos os usuários veem todas as reuniões (coleção única `meetings`). Pode ser
intencional para um workspace compartilhado, mas transcrições são sensíveis e não há
campo de propriedade nem controle de quem pode ver o quê.

**Correção:** decidir explicitamente o modelo (compartilhado vs. por consultor/cliente)
e refletir em campos e regras de acesso.

---

## 7. Oportunidades de novas funcionalidades

Além das correções, ideias que aumentam o valor do Suiter Record como ferramenta
interna:

- **Busca por RAG / embeddings** — hoje a busca inteligente envia *todas* as
  transcrições ao Gemini a cada pergunta (`App.tsx:1847`); não escala e custa caro.
  Indexar por embeddings e recuperar só os trechos relevantes.
- **Edição das decisões** — tópicos, tarefas e participantes são editáveis, mas as
  "decisões" são só exibição com fallback fictício. Permitir editar/adicionar decisões
  reais.
- **Registro de áudio no Storage** — guardar opcionalmente o áudio original no Firebase
  Storage para reprocessamento e auditoria, com política de retenção.
- **Sincronização bidirecional com a Agenda** — anexar o link da ata ao evento do
  Google Agenda e criar lembretes de tarefas com prazos no calendário do responsável.
- **Painel de tarefas transversal** — visão consolidada de todas as ações pendentes por
  responsável e prioridade, cruzando reuniões; hoje as tarefas ficam presas a cada
  reunião.
- **Trilha de auditoria** — registrar quem criou, editou ou exportou cada reunião;
  essencial para uma ferramenta que gera atas oficiais.
- **Diarização com nomes reais** — alimentar o modelo com a lista de participantes
  confirmados para rotular falas com nomes reais em vez de "Palestrante 1/2".
- **Observabilidade e CI** — adicionar monitoramento de erros (ex.: Sentry), testes
  automatizados e um pipeline de CI/CD; hoje não há testes nem verificação de tipos no
  build.

---

## 8. Roteiro priorizado

As fases 1 e 2 são pré-requisito para usar o app com dados reais de clientes.

| Prazo | Fase | Ações | Achados |
|-------|------|-------|---------|
| Imediato | Conter a exposição | Fechar as regras do Firestore; remover o seletor de senhas do login; parar de armazenar senhas em texto puro. | SEG-01, SEG-02 |
| Semana 1–2 | Autenticação real | Migrar para Firebase Auth (Google + custom claims); proteger os endpoints da API; corrigir reset de senha e login simulado. | SEG-03, SEG-04, SEG-05, SEG-06 |
| Semana 2–3 | Corrigir bugs visíveis | Id do modelo Gemini; valores de prioridade; logs do Suiter; remover dados fictícios das atas; fuso da agenda. | BUG-01, BUG-02, BUG-03, BUG-04, CAL-01 |
| Semana 3–5 | Dados e persistência | Escritas incrementais + `onSnapshot`; escopo por dono; foto no Storage; alinhar limites de upload. | DB-01, DB-02, DB-03, DB-04 |
| Contínuo | Qualidade e produto | Refatorar `App.tsx`; UX/acessibilidade; integração real com o Suiter; busca por embeddings; testes, CI e monitoramento. | ARQ-01, UX-01, novas features |

---

*Revisão baseada no código-fonte enviado (React + Express + Firebase, gerado no Google
AI Studio) · 28 achados · 5 críticos · Confidencial — Triforce Consultoria.*
