# Deploy

Use este guia como índice rápido:

- Deploy produção (Docker + profiles): `docs/deploy-production.md`
- Deploy com EasyPanel + Traefik: seção **"Deploy com EasyPanel + Traefik"** em `docs/deploy-production.md`

## Variáveis de domínio (Traefik)

Defina no ambiente do EasyPanel:

```env
API_DOMAIN=api.seudominio.com
ERP_DOMAIN=erp.seudominio.com
MENU_DOMAIN=menu.seudominio.com
```

## Subir stack

```bash
docker compose --profile prod up -d --build
```
