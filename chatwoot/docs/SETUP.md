# Chatwoot — Clube TCL SEMP 2026 · Agência YBY

Central de atendimento (BKO) white-label para o programa Clube TCL SEMP.

---

## Pré-requisitos

- **Servidor**: Ubuntu 22.04 LTS (mínimo 2 vCPU, 4GB RAM, 40GB SSD)
- **Domínio**: `bko.ybyagencia.com.br` apontando para o IP do servidor
- **DNS**: Registro A configurado antes do deploy
- **Portas**: 22, 80, 443 abertas no firewall/security group

---

## Instalação Rápida

### 1. Clonar o repositório

```bash
git clone https://github.com/ag-yby-ag/netza-finhub.git
cd netza-finhub/chatwoot
```

### 2. Editar variáveis do deploy

Edite o topo do `scripts/deploy.sh`:

```bash
DOMAIN="bko.ybyagencia.com.br"
EMAIL_SSL="ti@ybyagencia.com.br"
INSTALL_DIR="/opt/chatwoot-tcl"
```

### 3. Executar deploy

```bash
chmod +x scripts/deploy.sh
sudo ./scripts/deploy.sh
```

O script instala Docker, Nginx, SSL, sobe containers e inicializa o banco.
Credenciais ficam em `/opt/chatwoot-tcl/credenciais.txt`.

### 4. Configurar .env

Edite `/opt/chatwoot-tcl/.env` com:

| Variável | Valor |
|----------|-------|
| `SMTP_PASSWORD` | API Key SendGrid ou App Password Gmail |
| `S3_BUCKET_NAME` | Nome do bucket S3 (ou use MinIO local) |
| `AWS_ACCESS_KEY_ID` | Credencial AWS |
| `AWS_SECRET_ACCESS_KEY` | Credencial AWS |

```bash
cd /opt/chatwoot-tcl && docker compose restart
```

### 5. Aplicar branding

```bash
chmod +x scripts/apply-branding.sh
./scripts/apply-branding.sh /opt/chatwoot-tcl
```

---

## Configuração no Painel

### Super Admin

Acesse `https://bko.ybyagencia.com.br/super_admin` e defina:

```
DEFAULT_LOCALE = pt_BR
TZ = America/Sao_Paulo
```

### Times e Inboxes

No painel principal (`/app`):

1. **Criar times:**
   - `Agentes SEMP` — atendentes do programa de varejo
   - `Agentes PRO` — atendentes do programa de instaladores

2. **Criar inboxes:**

   | Inbox | Tipo | Time | Cor Widget |
   |-------|------|------|-----------|
   | WhatsApp Clube SEMP | WhatsApp | Agentes SEMP | — |
   | WhatsApp Clube PRO | WhatsApp | Agentes PRO | — |
   | E-mail Suporte | Email | Agentes SEMP | — |
   | Chat Web SEMP | Web Widget | Agentes SEMP | `#E30613` |
   | Chat Web PRO | Web Widget | Agentes PRO | `#1A6FA8` |

3. **Anotar tokens e IDs** dos inboxes criados (necessários para widget e N8N)

---

## Integração: Widget no Portal Next.js

### 1. Copiar componente

```bash
cp chatwoot/widget/ChatwootWidget.tsx apps/web/components/
cp chatwoot/widget/widget-config.ts apps/web/components/
```

### 2. Adicionar ao layout

```tsx
// app/layout.tsx
import { ChatwootWidget } from '@/components/ChatwootWidget';

export default function Layout({ children }) {
  return (
    <html>
      <body>
        {children}
        <ChatwootWidget participante={participante} />
      </body>
    </html>
  );
}
```

### 3. Configurar tokens

No `.env.local` do portal:

```env
NEXT_PUBLIC_CHATWOOT_BASE_URL=https://bko.ybyagencia.com.br
NEXT_PUBLIC_CHATWOOT_TOKEN_SEMP=<token_do_inbox_chat_semp>
NEXT_PUBLIC_CHATWOOT_TOKEN_PRO=<token_do_inbox_chat_pro>
```

O componente identifica o participante logado (nome, email, CPF) e roteia para o inbox correto automaticamente.

---

## Integração: Handoff N8N → Chatwoot

### Variáveis no N8N

```env
CHATWOOT_URL=https://bko.ybyagencia.com.br
CHATWOOT_TOKEN=<api_access_token_do_admin>
ACCOUNT_ID=1
INBOX_SEMP_ID=<id>
INBOX_PRO_ID=<id>
TEAM_SEMP_ID=<id>
TEAM_PRO_ID=<id>
```

### Fluxo (5 nodes)

1. **Webhook Trigger** — POST `/chatwoot-handoff`
2. **IF Node** — segmento PRO ou SEMP → seleciona inbox_id e team_id
3. **HTTP Request** — `POST /api/v1/accounts/{id}/contacts` (busca ou cria contato)
4. **HTTP Request** — `POST /api/v1/accounts/{id}/conversations` (cria conversa `status: open`)
5. **HTTP Request** — `POST /api/v1/accounts/{id}/conversations/{id}/messages` (histórico como nota privada `private: true`)

Ver `n8n/chatwoot-handoff.js` para payloads completos de referência.

---

## Estrutura de Arquivos

```
chatwoot/
├── config/
│   ├── env.tcl                    # Template .env (renomear para .env)
│   ├── docker-compose.yml         # Stack Docker completa
│   ├── nginx.conf                 # Reverse proxy + SSL
│   └── installation_config.yml    # Branding Chatwoot
├── branding/
│   ├── colors.css                 # CSS variables TCL
│   ├── fonts.css                  # Google Sans imports
│   ├── tailwind.overrides.js      # Tokens Tailwind
│   └── logos/
│       ├── logo-tcl-semp.svg      # Logo light mode
│       ├── logo-tcl-semp-dark.svg # Logo dark mode
│       ├── logo-tcl-pro.svg       # Logo segmento PRO
│       ├── favicon.svg            # Favicon 512x512
│       └── ticielle-avatar.svg    # Avatar persona
├── scripts/
│   ├── deploy.sh                  # Instalação Ubuntu 22.04
│   └── apply-branding.sh          # Aplicar white-label
├── widget/
│   ├── ChatwootWidget.tsx         # Componente React
│   └── widget-config.ts           # Config por segmento
├── n8n/
│   └── chatwoot-handoff.js        # Payloads N8N
└── docs/
    └── SETUP.md                   # Este arquivo
```

---

## Identidade Visual

### Cores

| Nome | Hex | Uso |
|------|-----|-----|
| TCL Red | `#E30613` | Primária, CTA, destaque |
| Red Dark | `#B30000` | Hover, pressed |
| Red Light | `#FF2A35` | Sobre fundos escuros |
| Red Muted | `#FFF0F0` | Backgrounds sutis |
| PRO Blue | `#1A6FA8` | Segmento PRO |
| PRO Dark | `#0D1B2A` | PRO backgrounds escuros |
| Success | `#2E7D32` | Confirmações |
| Warning | `#E65100` | Alertas |
| Info | `#1A6FA8` | Informativos |

### Fontes

- **Display**: Google Sans Display (headlines, números)
- **Body**: Google Sans Text (interface, parágrafos)
- **Mono**: Google Sans Mono (dados, código, KPIs)

### Persona

**TICIELLE** — Especialista oficial do Clube TCL SEMP 2026.
Coloquial, próxima, entusiasta, resolutiva, empática.
Avatar: `branding/logos/ticielle-avatar.svg`

---

## Troubleshooting

### Containers não sobem
```bash
cd /opt/chatwoot-tcl
docker compose logs rails
docker compose logs postgres
```

### SSL não funciona
```bash
# Verificar DNS
dig bko.ybyagencia.com.br

# Renovar certificado
certbot renew --force-renewal
systemctl reload nginx
```

### Widget não aparece
1. Verificar token no `.env.local` do portal
2. Verificar se o inbox está ativo no painel Chatwoot
3. Console do navegador: procurar erros de CORS ou carregamento do SDK

### Erro 502 Bad Gateway
```bash
# Rails não está respondendo
docker compose restart rails
# Verificar saúde
curl -sf http://localhost:3000/auth/sign_in
```

---

## Manutenção

### Backup do banco
```bash
docker compose exec postgres pg_dump -U chatwoot chatwoot_production > backup_$(date +%F).sql
```

### Atualizar Chatwoot
```bash
cd /opt/chatwoot-tcl
docker compose pull
docker compose up -d
docker compose exec rails bundle exec rails db:chatwoot_prepare
```

### Logs
```bash
docker compose logs -f rails        # App
docker compose logs -f sidekiq      # Background jobs
tail -f /var/log/nginx/chatwoot_*   # Nginx
```

---

**Agência YBY** · Projeto Clube TCL SEMP · JOB 0002.25 · Março 2026
