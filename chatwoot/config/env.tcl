# ══════════════════════════════════════════════════════════════════════
# Chatwoot — Clube TCL SEMP 2026 · Agência YBY
# Variáveis de Ambiente (renomear para .env antes de usar)
# ══════════════════════════════════════════════════════════════════════

# ── INSTALAÇÃO ─────────────────────────────────────────────────────
INSTALLATION_NAME="Clube TCL SEMP"
BRAND_NAME="Clube TCL SEMP"
BRAND_URL="https://clubetclsemp.com.br"
WIDGET_BRAND_URL=""
TERMS_URL="https://clubetclsemp.com.br/regulamento"
PRIVACY_URL="https://clubetclsemp.com.br/privacidade"

# ── URLs ────────────────────────────────────────────────────────────
FRONTEND_URL=https://bko.ybyagencia.com.br
RAILS_ENV=production
NODE_ENV=production
SECRET_KEY_BASE=SUBSTITUA_openssl_rand_hex_64

# ── LOCALE ──────────────────────────────────────────────────────────
DEFAULT_LOCALE=pt_BR
TZ=America/Sao_Paulo

# ── POSTGRESQL ──────────────────────────────────────────────────────
POSTGRES_HOST=postgres
POSTGRES_PORT=5432
POSTGRES_DATABASE=chatwoot_production
POSTGRES_USERNAME=chatwoot
POSTGRES_PASSWORD=SUBSTITUA_senha_forte_postgres
RAILS_MAX_THREADS=5

# ── REDIS ───────────────────────────────────────────────────────────
REDIS_URL=redis://:SUBSTITUA_senha_forte_redis@redis:6379/0
REDIS_PASSWORD=SUBSTITUA_senha_forte_redis

# ── SIDEKIQ ─────────────────────────────────────────────────────────
SIDEKIQ_CONCURRENCY=10

# ── E-MAIL / SMTP ──────────────────────────────────────────────────
# SendGrid
MAILER_SENDER_EMAIL=suporte@clubetclsemp.com.br
SMTP_DOMAIN=clubetclsemp.com.br
SMTP_ADDRESS=smtp.sendgrid.net
SMTP_PORT=587
SMTP_AUTHENTICATION=plain
SMTP_USERNAME=apikey
SMTP_PASSWORD=SUBSTITUA_SENDGRID_API_KEY
SMTP_ENABLE_STARTTLS_AUTO=true
SMTP_OPENSSL_VERIFY_MODE=peer

# Opção Gmail (descomente e ajuste se usar Gmail)
# SMTP_ADDRESS=smtp.gmail.com
# SMTP_PORT=587
# SMTP_USERNAME=suporte@ybyagencia.com.br
# SMTP_PASSWORD=SUBSTITUA_APP_PASSWORD_GMAIL

# ── E-MAIL / IMAP (recebimento) ────────────────────────────────────
# MAILER_INBOUND_EMAIL_DOMAIN=bko.ybyagencia.com.br
# RAILS_INBOUND_EMAIL_SERVICE=relay

# ── STORAGE ─────────────────────────────────────────────────────────
# AWS S3
ACTIVE_STORAGE_SERVICE=s3
S3_BUCKET_NAME=SUBSTITUA_nome_do_bucket
AWS_ACCESS_KEY_ID=SUBSTITUA_access_key
AWS_SECRET_ACCESS_KEY=SUBSTITUA_secret_key
AWS_REGION=sa-east-1

# Opção MinIO / armazenamento local (descomente se necessário)
# ACTIVE_STORAGE_SERVICE=minio
# MINIO_ENDPOINT=http://minio:9000
# MINIO_ACCESS_KEY=SUBSTITUA
# MINIO_SECRET_KEY=SUBSTITUA
# MINIO_BUCKET_NAME=chatwoot

# ── LOG ─────────────────────────────────────────────────────────────
LOG_LEVEL=info
LOG_SIZE=500
RAILS_LOG_TO_STDOUT=true

# ── RATE LIMITING ───────────────────────────────────────────────────
ENABLE_RACK_ATTACK=true

# ── INTEGRATIONS ────────────────────────────────────────────────────
# Facebook / Instagram
# FB_APP_ID=
# FB_APP_SECRET=
# FB_VERIFY_TOKEN=

# WhatsApp Business API (Cloud API)
# WHATSAPP_APP_ID=
# WHATSAPP_APP_SECRET=

# Slack
# SLACK_CLIENT_ID=
# SLACK_CLIENT_SECRET=

# ── PUSH NOTIFICATIONS ─────────────────────────────────────────────
# VAPID_PUBLIC_KEY=
# VAPID_PRIVATE_KEY=

# ── SUPER ADMIN ─────────────────────────────────────────────────────
# Definir após primeiro setup via rails console
# SUPER_ADMIN_EMAIL=admin@ybyagencia.com.br

# ── IB PLATFORM (integração) ───────────────────────────────────────
# IB_PLATFORM_BASE_URL=https://api.clubetclsemp.com.br
# IB_PLATFORM_API_KEY=SUBSTITUA

# ── N8N (handoff) ──────────────────────────────────────────────────
# N8N_WEBHOOK_URL=https://n8n.ybyagencia.com.br/webhook/chatwoot-handoff
# N8N_AUTH_TOKEN=SUBSTITUA

# ── GEMINI (referência — usado no N8N, não no Chatwoot) ────────────
# GEMINI_MODEL=gemini-1.5-pro
# GEMINI_TEMPERATURE_WEB=0.7
# GEMINI_MAX_TOKENS_WEB=600
# GEMINI_MAX_TOKENS_WA=400
