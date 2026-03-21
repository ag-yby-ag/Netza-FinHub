# Plano: Workflow de Programação com Codex Skills

**Gerado**: 2026-03-21
**Complexidade**: Medium
**Propósito**: Guia interativo para solicitar e executar qualquer app/site/plataforma usando os skills instalados

---

## Visão Geral

Este documento descreve o fluxo completo: do pedido inicial até a entrega do código.
Cada fase mapeia **qual skill usar**, **quando usar**, e **o que ele produz**.

```
PEDIDO → PESQUISA → PLANO → DESIGN → EXECUÇÃO → REVISÃO → ENTREGA
```

---

## Como Solicitar um Projeto

### Template de Pedido (preencha e envie ao Claude)

```
Quero construir: [app / site / plataforma]
Nome: [nome do projeto]
Objetivo: [o que resolve / para quem]
Stack preferida: [React, Next.js, Vue, mobile, etc — ou "sem preferência"]
Funcionalidades principais:
  1. [feature 1]
  2. [feature 2]
  3. [feature 3]
Integrações: [APIs externas, banco de dados, auth, etc]
Deploy: [Vercel, AWS, local, etc]
Prazo/complexidade: [MVP rápido / produto completo]
```

---

## Fase 0 — Pesquisa e Reuso

**Objetivo**: Não reinventar a roda. Encontrar código, docs e padrões prontos.

| Skill | Uso | Output |
|-------|-----|--------|
| `read-github` | Buscar repos similares no GitHub | Lista de referências e código reutilizável |
| `context7` | Buscar docs atualizadas da stack escolhida | Documentação + exemplos de código |
| `openai-docs-skill` | Se o projeto usa OpenAI/LLM | Padrões de integração corretos |
| `markdown-url` | Converter qualquer site em markdown legível | Conteúdo de referência para o Claude |

**Comando**:
```
/read-github [nome do projeto similar]
/context7 [framework escolhido]
```

---

## Fase 1 — Planejamento

**Objetivo**: Criar um plano detalhado por sprints antes de escrever código.

| Skill | Uso | Output |
|-------|-----|--------|
| `planner` | Plano padrão por sprints | `[projeto]-plan.md` |
| `plan-harder` | Plano com análise profunda de riscos | Plano com gotchas e edge cases |
| `swarm-planner` | Plano para múltiplos agentes em paralelo | DAG de tarefas com dependências |
| `llm-council` | Múltiplos "especialistas" avaliam o plano | Feedback multi-perspectiva |

**Quando usar cada um**:
- Projeto simples → `/planner`
- Projeto complexo / crítico → `/plan-harder`
- Projeto grande (muitas features independentes) → `/swarm-planner`
- Decisão arquitetural difícil → `/llm-council`

---

## Fase 2 — Design e UI

**Objetivo**: Definir a aparência e UX antes de codar.

| Skill | Uso | Output |
|-------|-----|--------|
| `frontend-design` | Interface distintiva e profissional | Componentes com sistema de design |
| `frontend-responsive-ui` | Layout mobile-first responsivo | Grid, breakpoints, fluid typography |
| `vercel-react-best-practices` | Performance e boas práticas Next.js/React | Code splitting, otimizações |
| `gemini-computer-use` | Testar UI com browser automatizado | Screenshots + validação visual |

**Fluxo de Design**:
```
1. /frontend-design → cria identidade visual + componentes base
2. /frontend-responsive-ui → garante responsividade
3. /vercel-react-best-practices → aplica otimizações
4. /gemini-computer-use → valida visualmente no browser
```

---

## Fase 3 — Execução (Agentes em Paralelo)

**Objetivo**: Codar múltiplas features simultaneamente.

| Skill | Uso | Output |
|-------|-----|--------|
| `parallel` | Tarefas independentes em paralelo simples | Código de múltiplas features |
| `parallel-task` | Execução paralela estruturada | Tarefas com contexto isolado |
| `parallel-task-spark` | Paralelo com modo spark (rápido) | Features prontas em paralelo |
| `super-swarm-spark` | Swarm completo de agentes | Sistema inteiro construído em paralelo |

**Quando usar cada um**:
```
2-3 features independentes    → /parallel
4-6 features com contexto     → /parallel-task
Muitas features simples       → /parallel-task-spark
Sistema completo / plataforma → /super-swarm-spark
```

**Exemplo de execução paralela**:
```
/parallel-task
- Agente 1: Cria autenticação (login/registro)
- Agente 2: Cria dashboard principal
- Agente 3: Cria API REST
- Agente 4: Cria banco de dados + migrations
```

---

## Fase 4 — Agentes Especializados

**Objetivo**: Criar agentes customizados para o projeto.

| Skill | Uso | Output |
|-------|-----|--------|
| `role-creator` | Cria agente especializado no seu domínio | `.toml` em `~/.claude/agents/` |
| `agent-browser` | Automação de browser headless (Rust) | Testes E2E, scraping, automação |

**Exemplo**:
```
/role-creator
"Preciso de um agente especialista em fintech brasileiro,
que conhece Pix, Open Finance, CVM e BACEN"
```

---

## Fase 5 — Revisão e Qualidade

**Objetivo**: Garantir código seguro, testado e otimizado.

| Ação | Skill/Agente | Critério |
|------|-------------|----------|
| Revisão de código | `code-reviewer` agent | CRITICAL e HIGH resolvidos |
| Segurança | `security-reviewer` agent | OWASP Top 10 verificado |
| Testes E2E | `agent-browser` ou `e2e-runner` agent | Fluxos críticos passando |
| Performance | `vercel-react-best-practices` | Core Web Vitals OK |

---

## Fase 6 — Entrega e Deploy

**Objetivo**: Código comitado, branch criado, PR aberto.

```bash
# Branch de feature
git checkout -b claude/feature-[nome]

# Commit
git add -A
git commit -m "feat: [descrição do projeto]"

# Push + PR
git push -u origin claude/feature-[nome]
gh pr create --title "[nome do projeto]" --body "..."
```

---

## Fluxo Completo — Diagrama

```
PEDIDO DO USUÁRIO
      │
      ▼
[Fase 0] PESQUISA
  read-github → busca repos similares
  context7    → busca docs da stack
      │
      ▼
[Fase 1] PLANEJAMENTO
  planner / plan-harder / swarm-planner
  llm-council (se decisão crítica)
      │
      ▼
[Fase 2] DESIGN
  frontend-design → identidade visual
  frontend-responsive-ui → responsividade
  vercel-react-best-practices → performance
      │
      ▼
[Fase 3] EXECUÇÃO PARALELA
  parallel / parallel-task / parallel-task-spark
  super-swarm-spark (projetos grandes)
      │
      ▼
[Fase 4] AGENTES ESPECIALIZADOS
  role-creator → agente do domínio
  agent-browser → automação/testes
      │
      ▼
[Fase 5] REVISÃO
  code-reviewer + security-reviewer
  testes E2E
      │
      ▼
[Fase 6] ENTREGA
  git commit + push + PR
```

---

## Exemplos de Uso por Tipo de Projeto

### MVP Rápido (1-2 dias)
```
/planner → /parallel-task → /vercel-react-best-practices → deploy
```

### App Completo (1-2 semanas)
```
/read-github → /plan-harder → /llm-council → /swarm-planner
→ /parallel-task-spark → /role-creator → /agent-browser
→ code-reviewer → deploy
```

### Plataforma / SaaS (2-4 semanas)
```
/read-github → /context7 → /plan-harder → /llm-council
→ /swarm-planner → /super-swarm-spark → /role-creator
→ /agent-browser → security-reviewer → deploy
```

---

## Referência Rápida de Skills

| Skill | Comando | Para que serve |
|-------|---------|---------------|
| `planner` | `/planner` | Plano por sprints |
| `plan-harder` | `/plan-harder` | Plano profundo com riscos |
| `swarm-planner` | `/swarm-planner` | Plano multi-agente |
| `llm-council` | `/llm-council` | Múltiplas perspectivas |
| `read-github` | `/read-github` | Buscar código no GitHub |
| `context7` | `/context7` | Docs atualizadas |
| `openai-docs-skill` | `/openai-docs-skill` | Docs OpenAI |
| `markdown-url` | `/markdown-url` | Site → markdown |
| `frontend-design` | `/frontend-design` | Design de UI |
| `frontend-responsive-ui` | `/frontend-responsive-ui` | UI responsiva |
| `vercel-react-best-practices` | `/vercel-react-best-practices` | Best practices React |
| `parallel` | `/parallel` | Tarefas em paralelo |
| `parallel-task` | `/parallel-task` | Paralelo estruturado |
| `parallel-task-spark` | `/parallel-task-spark` | Paralelo rápido |
| `super-swarm-spark` | `/super-swarm-spark` | Swarm completo |
| `role-creator` | `/role-creator` | Criar agente custom |
| `agent-browser` | `/agent-browser` | Browser headless |
| `gemini-computer-use` | `/gemini-computer-use` | Validação visual |
