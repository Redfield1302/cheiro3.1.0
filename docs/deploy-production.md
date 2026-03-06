# Deploy em Produção

Este guia descreve um fluxo prático para publicar o monorepo (`api` + `front-pdr-erp` + `front-cardapio`) com Docker.

## 1. Pré-requisitos

- Docker e Docker Compose instalados no servidor.
- Domínio configurado (ex.: `api.seudominio.com`, `erp.seudominio.com`, `menu.seudominio.com`).
- Banco PostgreSQL de produção (gerenciado ou container dedicado).

## 2. Variáveis de ambiente (API)

Crie `api/.env` no servidor com valores reais:

```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DB_NAME?schema=public
JWT_SECRET=SUA_CHAVE_FORTE_AQUI
PORT=3000
NODE_ENV=production
```

Observação:
- Com `NODE_ENV=production`, o `ensureSeed` **não** executa.

## 3. Build e subida (profile prod)

Na raiz do projeto:

```bash
docker compose --profile prod up -d --build
```

Serviços esperados:
- API: exposta via Traefik (`API_DOMAIN`)
- ERP: exposta via Traefik (`ERP_DOMAIN`)
- Cardápio: exposto via Traefik (`MENU_DOMAIN`)

## 4. Migrações do banco

Após subir a API, aplique migrações:

```bash
docker compose --profile prod exec api npx prisma migrate deploy
```

## 5. Deploy com EasyPanel + Traefik

O `docker-compose.yml` já foi adaptado para Traefik com labels nos serviços de produção (`api`, `erp`, `cardapio`).

Variáveis obrigatórias para roteamento:

```env
API_DOMAIN=api.seudominio.com
ERP_DOMAIN=erp.seudominio.com
MENU_DOMAIN=menu.seudominio.com
```

Requisitos:
- A rede externa `traefik-public` deve existir no host.
- O Traefik deve estar conectado nessa rede.
- EntryPoint HTTPS em `websecure`.

Criar rede (uma vez):

```bash
docker network create traefik-public
```

Exemplo de deploy no EasyPanel:

```bash
docker compose --profile prod up -d --build
```

## 6. Reverse proxy e HTTPS (geral)

Publique os serviços atrás de Nginx/Traefik/Caddy:

- `api.seudominio.com` -> `localhost:3000`
- `erp.seudominio.com` -> `localhost:8080`
- `menu.seudominio.com` -> `localhost:8081`

Ative TLS (Let's Encrypt) e headers de segurança.

## 7. Onboarding inicial (sem seed fixo)

Com a aplicação no ar:

- Acesse ERP em `/register`.
- Cadastre o estabelecimento (tenant) e o usuário admin.
- Faça login com o novo usuário.

## 8. Operação e manutenção

Comandos úteis:

```bash
docker compose --profile prod ps
docker compose --profile prod logs -f api
docker compose --profile prod restart api
docker compose --profile prod down
```

Atualização de versão:

```bash
git pull
docker compose --profile prod up -d --build
docker compose --profile prod exec api npx prisma migrate deploy
```

## 9. Checklist de produção

- `NODE_ENV=production`
- `JWT_SECRET` forte
- Banco com backup automático
- HTTPS ativo
- Monitoramento de logs e saúde (`/health`)
- Política de restore testada
