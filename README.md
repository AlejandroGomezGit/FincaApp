# 🌱 FincaApp — Administración de Fincas

> Gestión integral de fincas cafeteras/agrícolas: cultivos, actividades,
> jornales, transacciones, un dashboard financiero, analítica predictiva de
> ingresos/cosechas y recomendaciones agronómicas basadas en el clima real de
> la región de cada finca.

[![CI](https://github.com/TU_USUARIO/FincaApp/actions/workflows/ci.yml/badge.svg)](https://github.com/TU_USUARIO/FincaApp/actions/workflows/ci.yml)
![Node](https://img.shields.io/badge/Node.js-22-339933?logo=node.js&logoColor=white)
![Angular](https://img.shields.io/badge/Angular-21-DD0031?logo=angular&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)
![Kubernetes](https://img.shields.io/badge/Kubernetes-Ingress%20%2B%20NetworkPolicy-326CE5?logo=kubernetes&logoColor=white)

> Reemplaza `TU_USUARIO` en el badge de CI de arriba por el owner real una
> vez subido el repo a GitHub, para que el badge apunte al workflow real.

## Arquitectura

Tres microservicios reales (no un monolito con nombre de microservicio) +
gateway/Ingress + frontend Angular. El diseño completo, con diagrama y el
razonamiento detrás de cada decisión (incluyendo qué se decidió **no**
construir y por qué), está en **[ARCHITECTURE.md](./ARCHITECTURE.md)**.

```
┌─────────────┐     ┌────────────────────┐     ┌──────────────────┐
│  Frontend   │────▶│  Gateway (nginx) /  │────▶│   auth-service    │  JWT, RBAC, refresh tokens
│  (Angular)  │     │  Ingress (k8s)      │────▶│   weather-service │  stateless, sin BD
└─────────────┘     └────────────────────┘────▶│   core-api        │  fincas/cultivos/.../analítica
                                                  └──────────────────┘
```

Seguridad: **[SECURITY.md](./SECURITY.md)** — hardening real implementado en
código (no solo un documento), mapeado contra el OWASP Top 10, con las
limitaciones honestas explicadas en vez de ocultadas.

## Stack

| Capa | Tecnología |
|------|-----------|
| Frontend | Angular 21 (standalone components, signals) + Angular Material + ng2-charts |
| Backend | Node.js 22 + Express, 3 servicios independientes |
| Base de datos | PostgreSQL 16 + Prisma ORM |
| Auth | JWT (access 15min + refresh 7 días con rotación), bcrypt, RBAC |
| Contenedores | Docker multi-stage builds, usuarios no-root |
| Orquestación | Kubernetes (Deployments, HPA, Ingress, NetworkPolicy, Kustomize) |
| CI/CD | GitHub Actions (tests con Postgres real, build de imágenes, Trivy, npm audit) |
| Testing | Jest + Supertest (44 tests: unit + integración) |
| Clima | Open-Meteo (geocoding + pronóstico, sin API key) |

## Levantar el proyecto

### Opción A — Docker Compose (recomendada, todo el stack de una vez)

```bash
cp .env.example .env
# edita .env: POSTGRES_PASSWORD, JWT_SECRET, INTERNAL_SERVICE_TOKEN

docker compose up -d --build
docker compose exec core-api node prisma/seed.js   # datos de prueba

# abre http://localhost:8080
```

### Opción B — Kubernetes (kind/minikube/cualquier clúster con Ingress)

```bash
# Requiere un Ingress controller nginx instalado en el clúster, ver
# k8s/base/ingress.yaml para el comando exacto.

kubectl create namespace fincaapp
cp k8s/base/secret.example.yaml k8s/base/secret.yaml   # y edita los valores
kubectl apply -f k8s/base/secret.yaml

kubectl apply -k k8s/base
kubectl apply -f k8s/base/migrate-job.yaml
kubectl wait --for=condition=complete job/db-migrate -n fincaapp --timeout=60s
kubectl exec -n fincaapp deployment/core-api -- node prisma/seed.js

# overlay de producción (más réplicas, host real):
kubectl apply -k k8s/overlays/production
```

### Opción C — Local sin contenedores (desarrollo día a día)

```bash
# 1. Postgres corriendo localmente, crea la base:
createdb finca_app

# 2. Cada servicio en su propia terminal:
cd services/core-api      && cp .env.example .env && npm install && npx prisma db push && npm run db:seed && npm run dev
cd services/auth-service  && cp .env.example .env && npm install && npx prisma generate && npm run dev
cd services/weather-service && cp .env.example .env && npm install && npm run dev
cd frontend                && npm install && npm start

# El frontend (ng serve, puerto 4200) necesita algo enrutando /api/* a los
# tres servicios (auth-service:4001, weather-service:4002, core-api:4000) —
# usa el gateway (`docker compose up gateway` apuntando a tus procesos
# locales, o cualquier reverse proxy equivalente).
```

**Credenciales de prueba:** `admin@finca.com` / `admin123`

## Módulos

| Módulo | Descripción |
|--------|-------------|
| **Fincas** | CRUD de fincas + ranking de rentabilidad entre todas tus fincas |
| **Cultivos** | Café, plátano, yuca, maíz, aguacate, fríjol por finca |
| **Actividades** | Siembra, fertilización, fumigación, poda, cosecha, etc. con fechas |
| **Jornales** | Registro de mano de obra por actividad (trabajador, días, valor) |
| **Trabajadores** | Personal activo/inactivo por finca |
| **Transacciones** | Ingresos y egresos (venta cosecha, insumos, maquinaria, servicios) |
| **Dashboard** | Balance mensual, KPIs, costo por actividad, próximas cosechas |
| **Analítica predictiva** | Proyección financiera (regresión lineal) y tendencia de rendimiento por cultivo |
| **Clima y recomendaciones** | Pronóstico 7 días (Open-Meteo) + reglas agronómicas cruzando clima con tus actividades |

## API

Todo pasa por el gateway/Ingress en `/api/...`; cada servicio expone `/health`
y `/ready` para probes de Kubernetes.

```
# auth-service
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/refresh
POST   /api/auth/logout
GET    /api/auth/me
GET    /api/auth/admin/users        (solo role=ADMIN)

# core-api
GET/POST       /api/farms
GET             /api/farms/ranking
GET/PUT/DELETE  /api/farms/:id
GET/POST        /api/farms/:farmId/crops
GET/PUT/DELETE  /api/farms/:farmId/crops/:id
GET/POST        /api/farms/:farmId/crops/:cropId/activities
GET/PUT/DELETE  /api/farms/:farmId/crops/:cropId/activities/:id
GET/POST        /api/farms/:farmId/crops/:cropId/activities/:activityId/jornales
PUT/DELETE      /api/farms/:farmId/crops/:cropId/activities/:activityId/jornales/:id
GET/POST        /api/farms/:farmId/workers
PUT/DELETE      /api/farms/:farmId/workers/:id
GET/POST        /api/farms/:farmId/transactions
PUT/DELETE      /api/farms/:farmId/transactions/:id
GET             /api/farms/:farmId/dashboard/summary
GET             /api/farms/:farmId/dashboard/monthly-balance?year=2026
GET             /api/farms/:farmId/dashboard/activity-costs
GET             /api/farms/:farmId/analytics/forecast

# weather-service
GET    /api/farms/:farmId/weather
```

## Tests

```bash
cd services/auth-service    && npm test   # 10 tests: registro, login, refresh+rotación, RBAC
cd services/weather-service && npm test   # 13 tests: reglas de recomendación, geocoding con fallback
cd services/core-api        && npm test   # 21 tests: frontera de ownership entre usuarios, forecast.service
```

CI (`.github/workflows/ci.yml`) corre los tres contra un Postgres real en
cada push/PR, además de build del frontend, build de las 5 imágenes Docker,
`npm audit` + Trivy, y validación de los manifiestos de k8s con
`kustomize build`.

## Estructura del repo

```
FincaApp/
├── frontend/                  Angular 21
├── services/
│   ├── auth-service/          JWT, RBAC, refresh tokens — dueño de User/RefreshToken
│   ├── weather-service/       stateless, sin BD — Open-Meteo + reglas agronómicas
│   ├── core-api/              fincas/cultivos/.../analítica — dueño del resto del schema
│   └── gateway/                nginx reverse proxy (solo docker-compose)
├── k8s/
│   ├── base/                  Deployments, Services, HPA, Ingress, NetworkPolicy, Kustomize
│   └── overlays/production/   réplicas y recursos para producción
├── docker-compose.yml
├── .github/workflows/ci.yml
├── ARCHITECTURE.md
└── SECURITY.md
```
