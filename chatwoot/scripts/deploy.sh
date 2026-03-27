#!/usr/bin/env bash
# ══════════════════════════════════════════════════════════════════════
# Deploy — Chatwoot · Clube TCL SEMP 2026 · Agência YBY
# Instalação automatizada para Ubuntu 22.04
#
# Uso:
#   chmod +x deploy.sh
#   sudo ./deploy.sh
# ══════════════════════════════════════════════════════════════════════

set -euo pipefail

# ── CONFIGURAÇÃO ─────────────────────────────────────────────────────
DOMAIN="bko.ybyagencia.com.br"
EMAIL_SSL="ti@ybyagencia.com.br"
INSTALL_DIR="/opt/chatwoot-tcl"
CHATWOOT_VERSION="latest"  # ou tag específica: v3.x.x

# ── CORES DO OUTPUT ──────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log()  { echo -e "${GREEN}[✓]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
err()  { echo -e "${RED}[✗]${NC} $1"; exit 1; }
step() { echo -e "\n${BLUE}══ $1 ══${NC}"; }

# ── VERIFICAÇÕES ─────────────────────────────────────────────────────
[[ $EUID -ne 0 ]] && err "Execute como root: sudo ./deploy.sh"
[[ ! -f /etc/os-release ]] && err "Sistema não suportado"
source /etc/os-release
[[ "$ID" != "ubuntu" ]] && warn "Script otimizado para Ubuntu 22.04. Pode funcionar em $PRETTY_NAME."

step "1/8 · Atualizando sistema"
apt-get update -qq
apt-get upgrade -y -qq
apt-get install -y -qq \
  curl wget git apt-transport-https ca-certificates \
  gnupg lsb-release software-properties-common \
  ufw fail2ban jq openssl
log "Sistema atualizado"

step "2/8 · Instalando Docker"
if ! command -v docker &>/dev/null; then
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" > /etc/apt/sources.list.d/docker.list
  apt-get update -qq
  apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-compose-plugin
  systemctl enable docker
  systemctl start docker
  log "Docker instalado: $(docker --version)"
else
  log "Docker já instalado: $(docker --version)"
fi

step "3/8 · Preparando diretório de instalação"
mkdir -p "$INSTALL_DIR"
cd "$INSTALL_DIR"

# Copiar arquivos de configuração
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cp "$SCRIPT_DIR/config/docker-compose.yml" "$INSTALL_DIR/"
cp "$SCRIPT_DIR/config/env.tcl" "$INSTALL_DIR/.env"
mkdir -p "$INSTALL_DIR/brand-assets"
cp "$SCRIPT_DIR/branding/logos/"*.svg "$INSTALL_DIR/brand-assets/" 2>/dev/null || true
log "Arquivos copiados para $INSTALL_DIR"

# Gerar secrets se ainda são placeholder
if grep -q "SUBSTITUA_openssl_rand_hex_64" "$INSTALL_DIR/.env"; then
  SECRET=$(openssl rand -hex 64)
  sed -i "s/SUBSTITUA_openssl_rand_hex_64/$SECRET/" "$INSTALL_DIR/.env"
  log "SECRET_KEY_BASE gerado automaticamente"
fi

if grep -q "SUBSTITUA_senha_forte_postgres" "$INSTALL_DIR/.env"; then
  PG_PASS=$(openssl rand -base64 32 | tr -d '=/+')
  sed -i "s/SUBSTITUA_senha_forte_postgres/$PG_PASS/" "$INSTALL_DIR/.env"
  log "POSTGRES_PASSWORD gerado: $PG_PASS"
fi

if grep -q "SUBSTITUA_senha_forte_redis" "$INSTALL_DIR/.env"; then
  REDIS_PASS=$(openssl rand -base64 24 | tr -d '=/+')
  sed -i "s/SUBSTITUA_senha_forte_redis/$REDIS_PASS/g" "$INSTALL_DIR/.env"
  log "REDIS_PASSWORD gerado: $REDIS_PASS"
fi

step "4/8 · Instalando Nginx"
if ! command -v nginx &>/dev/null; then
  apt-get install -y -qq nginx
  systemctl enable nginx
  log "Nginx instalado"
else
  log "Nginx já instalado"
fi

step "5/8 · Configurando Nginx"
cp "$SCRIPT_DIR/config/nginx.conf" "/etc/nginx/sites-available/chatwoot"
ln -sf /etc/nginx/sites-available/chatwoot /etc/nginx/sites-enabled/chatwoot
rm -f /etc/nginx/sites-enabled/default

# Criar diretório certbot challenge
mkdir -p /var/www/certbot

# Testar config sem SSL primeiro (certificado ainda não existe)
cat > /etc/nginx/sites-available/chatwoot-temp <<'TEMPCONF'
server {
    listen 80;
    server_name DOMAIN_PLACEHOLDER;
    location /.well-known/acme-challenge/ { root /var/www/certbot; }
    location / { return 200 'Chatwoot setup in progress'; add_header Content-Type text/plain; }
}
TEMPCONF
sed -i "s/DOMAIN_PLACEHOLDER/$DOMAIN/" /etc/nginx/sites-available/chatwoot-temp
ln -sf /etc/nginx/sites-available/chatwoot-temp /etc/nginx/sites-enabled/chatwoot-temp
nginx -t && systemctl restart nginx
log "Nginx configurado temporariamente para SSL"

step "6/8 · Obtendo certificado SSL"
if ! command -v certbot &>/dev/null; then
  apt-get install -y -qq certbot python3-certbot-nginx
fi

if [[ ! -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]]; then
  certbot certonly --webroot -w /var/www/certbot \
    -d "$DOMAIN" \
    --email "$EMAIL_SSL" \
    --agree-tos --non-interactive \
    --preferred-challenges http
  log "Certificado SSL obtido para $DOMAIN"
else
  log "Certificado SSL já existe para $DOMAIN"
fi

# Ativar config SSL final
rm -f /etc/nginx/sites-enabled/chatwoot-temp
rm -f /etc/nginx/sites-available/chatwoot-temp
nginx -t && systemctl restart nginx
log "Nginx com SSL ativado"

# Auto-renovação
(crontab -l 2>/dev/null; echo "0 3 * * * certbot renew --quiet --post-hook 'systemctl reload nginx'") | sort -u | crontab -
log "Auto-renovação SSL configurada"

step "7/8 · Subindo containers"
cd "$INSTALL_DIR"
docker compose pull
docker compose up -d

# Aguardar PostgreSQL ficar pronto
echo -n "  Aguardando PostgreSQL..."
for i in $(seq 1 30); do
  if docker compose exec -T postgres pg_isready -U chatwoot &>/dev/null; then
    echo " OK"
    break
  fi
  echo -n "."
  sleep 2
done

# Inicializar banco de dados
log "Inicializando banco de dados..."
docker compose exec -T rails bundle exec rails db:chatwoot_prepare
log "Banco de dados inicializado"

step "8/8 · Configurando firewall"
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
log "Firewall configurado (22, 80, 443)"

# ── RESULTADO ────────────────────────────────────────────────────────
CRED_FILE="$INSTALL_DIR/credenciais.txt"
cat > "$CRED_FILE" <<EOF
══════════════════════════════════════════════════════
  Chatwoot — Clube TCL SEMP 2026
  Instalado em: $(date '+%Y-%m-%d %H:%M:%S')
══════════════════════════════════════════════════════

URL:          https://$DOMAIN
Super Admin:  https://$DOMAIN/super_admin
Dashboard:    https://$DOMAIN/app

Diretório:    $INSTALL_DIR
Docker:       docker compose -f $INSTALL_DIR/docker-compose.yml

──────────────────────────────────────────────────────
IMPORTANTE: Acesse /super_admin para criar a conta
de administrador inicial.
──────────────────────────────────────────────────────
EOF

chmod 600 "$CRED_FILE"

echo ""
echo -e "${GREEN}══════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  ✅ Chatwoot instalado com sucesso!${NC}"
echo -e "${GREEN}══════════════════════════════════════════════════════${NC}"
echo ""
echo -e "  URL:         ${BLUE}https://$DOMAIN${NC}"
echo -e "  Super Admin: ${BLUE}https://$DOMAIN/super_admin${NC}"
echo -e "  Credenciais: ${YELLOW}$CRED_FILE${NC}"
echo ""
echo -e "  Próximos passos:"
echo -e "    1. Edite ${YELLOW}$INSTALL_DIR/.env${NC} com SMTP e Storage"
echo -e "    2. Execute: ${BLUE}cd $INSTALL_DIR && docker compose restart${NC}"
echo -e "    3. Acesse ${BLUE}https://$DOMAIN/super_admin${NC} para configurar"
echo -e "    4. Execute: ${BLUE}$SCRIPT_DIR/scripts/apply-branding.sh${NC}"
echo ""
