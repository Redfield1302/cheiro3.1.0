# Cheio Gestor v5.0.0-alpha (Monorepo)

## Documentacao

- Visao geral: `docs/overview.md`
- API: `docs/api.md`
- Banco/Prisma: `docs/database.md`
- Front Cardapio: `docs/front-cardapio.md`
- Front ERP/PDV: `docs/front-pdr-erp.md`
- Changelog: `docs/changes.md`
- Setup completo: `docs/setup.md`

## Rodar API

```
cd api
copy .env.example .env
npm install
npx prisma migrate dev
npm run dev
```

## Rodar ERP/PDV

```
cd front-pdr-erp
npm install
npm run dev
```

## Rodar Cardapio

```
cd front-cardapio
npm install
npm run dev
```

## Rodar com Docker

Na raiz:

```bash
docker compose --profile prod up --build
```

- ERP: `http://localhost:8080`
- Cardapio: `http://localhost:8081/t/minhapizzaria`
- API: `http://localhost:3000`

Profile de desenvolvimento (hot reload):

```bash
docker compose --profile dev up --build
```

- ERP (Vite): `http://localhost:5173`
- Cardapio (Vite): `http://localhost:5174/t/minhapizzaria`
