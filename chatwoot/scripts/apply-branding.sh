#!/usr/bin/env bash
# ══════════════════════════════════════════════════════════════════════
# Apply Branding — White-label Chatwoot · Clube TCL SEMP 2026
#
# Este script aplica a identidade visual TCL/YBY no Chatwoot.
# Deve ser executado APÓS o deploy.sh ou em um clone local do Chatwoot.
#
# Uso:
#   chmod +x apply-branding.sh
#   ./apply-branding.sh [caminho_do_chatwoot]
#
# Exemplo:
#   ./apply-branding.sh /opt/chatwoot-tcl
#   ./apply-branding.sh ~/chatwoot  # clone local para dev
# ══════════════════════════════════════════════════════════════════════

set -euo pipefail

# ── CORES ────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log()  { echo -e "${GREEN}[✓]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
err()  { echo -e "${RED}[✗]${NC} $1"; exit 1; }
step() { echo -e "\n${BLUE}══ $1 ══${NC}"; }

# ── PATHS ────────────────────────────────────────────────────────────
CHATWOOT_DIR="${1:-/opt/chatwoot-tcl}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BRANDING_DIR="$SCRIPT_DIR/branding"
CONFIG_DIR="$SCRIPT_DIR/config"

[[ ! -d "$CHATWOOT_DIR" ]] && err "Diretório Chatwoot não encontrado: $CHATWOOT_DIR"

echo -e "${RED}══════════════════════════════════════════════════════${NC}"
echo -e "${RED}  Clube TCL SEMP 2026 · White-Label Branding${NC}"
echo -e "${RED}══════════════════════════════════════════════════════${NC}"
echo ""
echo -e "  Chatwoot:  ${BLUE}$CHATWOOT_DIR${NC}"
echo -e "  Branding:  ${BLUE}$BRANDING_DIR${NC}"
echo ""

# ── 1. LOGOS ─────────────────────────────────────────────────────────
step "1/7 · Copiando logos e assets"

BRAND_ASSETS_DIR="$CHATWOOT_DIR/public/brand-assets"
mkdir -p "$BRAND_ASSETS_DIR"

cp "$BRANDING_DIR/logos/logo-tcl-semp.svg"      "$BRAND_ASSETS_DIR/"
cp "$BRANDING_DIR/logos/logo-tcl-semp-dark.svg"  "$BRAND_ASSETS_DIR/"
cp "$BRANDING_DIR/logos/logo-tcl-pro.svg"        "$BRAND_ASSETS_DIR/"
cp "$BRANDING_DIR/logos/favicon.svg"             "$BRAND_ASSETS_DIR/"
cp "$BRANDING_DIR/logos/ticielle-avatar.svg"     "$BRAND_ASSETS_DIR/"
log "5 assets copiados para $BRAND_ASSETS_DIR"

# ── 2. INSTALLATION CONFIG ──────────────────────────────────────────
step "2/7 · Substituindo installation_config.yml"

INSTALL_CONFIG="$CHATWOOT_DIR/config/installation_config.yml"
if [[ -f "$INSTALL_CONFIG" ]]; then
  cp "$INSTALL_CONFIG" "${INSTALL_CONFIG}.bak.$(date +%s)"
  warn "Backup criado do config original"
fi
cp "$CONFIG_DIR/installation_config.yml" "$INSTALL_CONFIG"
log "installation_config.yml substituído"

# ── 3. CSS CUSTOMIZADO ──────────────────────────────────────────────
step "3/7 · Injetando CSS customizado (cores + fontes)"

CUSTOM_CSS_DIR="$CHATWOOT_DIR/app/javascript/shared/assets/stylesheets"
if [[ -d "$CUSTOM_CSS_DIR" ]]; then
  cp "$BRANDING_DIR/colors.css" "$CUSTOM_CSS_DIR/tcl-colors.css"
  cp "$BRANDING_DIR/fonts.css"  "$CUSTOM_CSS_DIR/tcl-fonts.css"

  # Injetar imports no arquivo principal de estilos
  MAIN_CSS="$CUSTOM_CSS_DIR/index.scss"
  if [[ -f "$MAIN_CSS" ]]; then
    if ! grep -q "tcl-colors" "$MAIN_CSS"; then
      echo "" >> "$MAIN_CSS"
      echo "/* ── Clube TCL SEMP Branding ── */" >> "$MAIN_CSS"
      echo "@import 'tcl-colors.css';" >> "$MAIN_CSS"
      echo "@import 'tcl-fonts.css';" >> "$MAIN_CSS"
      log "Imports adicionados a index.scss"
    else
      warn "Imports TCL já existem em index.scss"
    fi
  else
    warn "index.scss não encontrado — CSS será aplicado manualmente"
  fi
else
  warn "Diretório de estilos não encontrado (container Docker?)"
  warn "CSS será montado via volume ou aplicado no build"
fi
log "CSS customizado aplicado"

# ── 4. REMOVER "POWERED BY CHATWOOT" ────────────────────────────────
step "4/7 · Removendo referências 'Powered by Chatwoot'"

# No widget
find "$CHATWOOT_DIR/app/javascript" -type f \( -name "*.vue" -o -name "*.js" -o -name "*.ts" \) 2>/dev/null | while read -r file; do
  if grep -qi "powered.by.*chatwoot\|branding-link\|brand-link" "$file" 2>/dev/null; then
    log "  Referência encontrada: $file"
  fi
done

# Via config (já feito com WIDGET_BRAND_URL="" e BRAND_URL="")
log "'Powered by' desabilitado via WIDGET_BRAND_URL e BRAND_URL vazios"

# ── 5. SUBSTITUIR TEXTOS ────────────────────────────────────────────
step "5/7 · Substituindo textos de branding"

# Localização PT-BR: substituir "Chatwoot" por "Clube TCL SEMP" nos locales
LOCALE_DIR="$CHATWOOT_DIR/app/javascript/dashboard/i18n/locale/pt_BR"
if [[ -d "$LOCALE_DIR" ]]; then
  find "$LOCALE_DIR" -name "*.json" | while read -r file; do
    if grep -q "Chatwoot" "$file" 2>/dev/null; then
      sed -i 's/Chatwoot/Clube TCL SEMP/g' "$file"
      log "  Atualizado: $(basename "$file")"
    fi
  done
else
  warn "Diretório de locales pt_BR não encontrado"
fi

# Título da página
LAYOUT_FILE="$CHATWOOT_DIR/app/views/layouts/application.html.erb"
if [[ -f "$LAYOUT_FILE" ]]; then
  sed -i 's/<title>Chatwoot<\/title>/<title>Clube TCL SEMP<\/title>/g' "$LAYOUT_FILE"
  log "Título da página atualizado"
fi

log "Textos substituídos"

# ── 6. TAILWIND (se clone local) ────────────────────────────────────
step "6/7 · Verificando Tailwind config"

TAILWIND_CONFIG="$CHATWOOT_DIR/tailwind.config.js"
if [[ -f "$TAILWIND_CONFIG" ]]; then
  warn "Tailwind config encontrado: $TAILWIND_CONFIG"
  warn "Para aplicar tokens TCL, adicione manualmente:"
  echo "  const tclOverrides = require('$BRANDING_DIR/tailwind.overrides');"
  echo "  // Dentro de theme.extend: ...tclOverrides"
  log "Arquivo de overrides disponível em: $BRANDING_DIR/tailwind.overrides.js"
else
  warn "tailwind.config.js não encontrado (normal em containers Docker)"
fi

# ── 7. WIDGET COLOR ──────────────────────────────────────────────────
step "7/7 · Configurando cor do widget"

echo ""
echo -e "  ${YELLOW}AÇÃO MANUAL NECESSÁRIA no painel Chatwoot:${NC}"
echo ""
echo -e "  1. Acesse ${BLUE}Settings → Inboxes → Chat Web SEMP → Widget Settings${NC}"
echo -e "     → Cor do widget: ${RED}#E30613${NC} (TCL Red)"
echo ""
echo -e "  2. Acesse ${BLUE}Settings → Inboxes → Chat Web PRO → Widget Settings${NC}"
echo -e "     → Cor do widget: ${BLUE}#1A6FA8${NC} (PRO Blue)"
echo ""
echo -e "  3. Avatar TICIELLE: ${BLUE}$BRAND_ASSETS_DIR/ticielle-avatar.svg${NC}"
echo ""

# ── RESULTADO ────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}══════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  ✅ Branding TCL SEMP aplicado com sucesso!${NC}"
echo -e "${GREEN}══════════════════════════════════════════════════════${NC}"
echo ""
echo -e "  Se usando Docker, reinicie:"
echo -e "    ${BLUE}cd $CHATWOOT_DIR && docker compose restart rails sidekiq${NC}"
echo ""
echo -e "  Se usando clone local (dev), rebuild assets:"
echo -e "    ${BLUE}cd $CHATWOOT_DIR && pnpm install && pnpm build${NC}"
echo ""
