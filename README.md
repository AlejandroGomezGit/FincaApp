# FincaApp — Administración de Fincas

## Stack
- **Backend:** Node.js + Express + Prisma + PostgreSQL
- **Frontend:** Angular 17+ + Angular Material

---

## Arrancar el proyecto

### 1. Base de datos
Asegúrate de tener PostgreSQL corriendo y crea la base de datos:
```sql
CREATE DATABASE finca_app;
```

### 2. Backend
```bash
cd backend

# Configura el .env
cp .env.example .env
# Edita .env con tu usuario/contraseña de PostgreSQL

# Aplica el schema a la BD
npx prisma db push

# Carga datos de prueba (usuario: admin@finca.com / admin123)
npm run db:seed

# Inicia el servidor (puerto 3000)
npm run dev
```

### 3. Frontend
```bash
cd frontend

# Inicia el servidor de desarrollo (puerto 4200)
npm start
```

Abre [http://localhost:4200](http://localhost:4200)

**Credenciales de prueba:** `admin@finca.com` / `admin123`

---

## Módulos

| Módulo | Descripción |
|--------|-------------|
| **Fincas** | CRUD de fincas con estadísticas |
| **Cultivos** | Café, plátano, yuca, maíz, aguacate, fríjol por finca |
| **Actividades** | Siembra, fertilización, fumigación, poda, cosecha, etc. con fechas |
| **Jornales** | Registro de mano de obra por actividad (trabajador, días, valor) |
| **Trabajadores** | Personal activo/inactivo por finca |
| **Transacciones** | Ingresos y egresos (venta cosecha, insumos, maquinaria, servicios) |
| **Dashboard** | Balance mensual, KPIs, costo por actividad, próximas cosechas |

## API Endpoints

```
POST   /api/auth/register
POST   /api/auth/login
GET    /api/auth/me

GET/POST       /api/farms
GET/PUT/DELETE /api/farms/:id

GET/POST       /api/farms/:farmId/crops
GET/PUT/DELETE /api/farms/:farmId/crops/:id

GET/POST       /api/farms/:farmId/crops/:cropId/activities
GET/PUT/DELETE /api/farms/:farmId/crops/:cropId/activities/:id

GET/POST       /api/farms/:farmId/crops/:cropId/activities/:activityId/jornales
PUT/DELETE     /api/farms/:farmId/crops/:cropId/activities/:activityId/jornales/:id

GET/POST       /api/farms/:farmId/workers
PUT/DELETE     /api/farms/:farmId/workers/:id

GET/POST       /api/farms/:farmId/transactions
PUT/DELETE     /api/farms/:farmId/transactions/:id

GET /api/farms/:farmId/dashboard/summary
GET /api/farms/:farmId/dashboard/monthly-balance?year=2026
GET /api/farms/:farmId/dashboard/activity-costs
```
