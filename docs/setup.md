# Setup

Root: `c:\Users\User\Pictures\cheiro3.1.0alpha`

## API

```
cd api
copy .env.example .env
npm install
npx prisma migrate dev
npm run dev
```

## ERP/PDV

```
cd front-pdr-erp
npm install
npm run dev
```

## Cardapio

```
cd front-cardapio
npm install
npm run dev
```

## Docker com profiles

Na raiz do projeto:

### Profile `prod` (build com nginx)

```bash
docker compose --profile prod up --build
```

Endpoints:

- API: `http://localhost:3000`
- ERP: `http://localhost:8080`
- Cardapio: `http://localhost:8081/t/minhapizzaria`

### Profile `dev` (hot reload)

```bash
docker compose --profile dev up --build
```

Endpoints:

- API: `http://localhost:3000`
- ERP (Vite): `http://localhost:5173`
- Cardapio (Vite): `http://localhost:5174/t/minhapizzaria`

Parar tudo:

```bash
docker compose down
```
