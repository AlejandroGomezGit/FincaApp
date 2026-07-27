# Seguridad — FincaApp

Este documento resume qué se hizo, por qué, y qué se dejó honestamente como
limitación conocida en lugar de fingir una solución. El objetivo no es una
lista de checkboxes, sino explicar decisiones defendibles.

## Reportar una vulnerabilidad

Este es un proyecto de portafolio, no un servicio en producción con datos
reales de usuarios. Si encuentras un problema, abre un issue en el
repositorio describiendo el hallazgo y cómo reproducirlo.

## OWASP Top 10 (2021) — qué se mitigó y cómo

| # | Categoría | Mitigación implementada |
|---|-----------|--------------------------|
| A01 | Broken Access Control | Todo endpoint de escritura/lectura de un recurso valida `ownership` contra el `userId` del JWT antes de tocar la fila (patrón `farmOwned`/`cropOwned` repetido en cada controller de `core-api`). Un usuario que intenta acceder a un recurso ajeno recibe **404, no 403** (no confirma que el recurso existe). Verificado con tests de integración reales en `services/core-api/src/__tests__/farms.test.js`. RBAC básico (`role: USER\|ADMIN`) protege el único endpoint administrativo (`GET /api/auth/admin/users`). |
| A02 | Cryptographic Failures | Contraseñas con `bcrypt` (12 rounds). Refresh tokens: valor aleatorio de 48 bytes (`crypto.randomBytes`), **nunca se guarda el valor real** — solo su hash SHA-256, así una fuga de la base de datos no expone tokens usables directamente. JWT firmado con `HS256` y un secreto de ≥32 caracteres (forzado por convención, no por validación de longitud — ver "Limitaciones" abajo). TLS se termina en el Ingress/Load Balancer delante del clúster, no dentro de la app (estándar en Kubernetes). |
| A03 | Injection | Toda consulta pasa por Prisma (queries parametrizadas, sin SQL crudo en ningún controller). Todo endpoint de escritura tiene validación de entrada con `express-validator` (tipos, rangos, enums) antes de llegar a la capa de datos — ver cualquier `*.routes.js` en `services/core-api/src/routes/`. |
| A04 | Insecure Design | Rate limiting agresivo en login/registro/refresh (`express-rate-limit`, 10 intentos/15min) para dificultar fuerza bruta. Refresh tokens con **rotación**: cada uso revoca el token anterior y emite uno nuevo, así un token robado y reutilizado dos veces queda detectado. Los límites de servicio (weather-service sin acceso a BD) están reforzados también a nivel de red (NetworkPolicy), no solo por convención de código. |
| A05 | Security Misconfiguration | `helmet` en los 3 servicios Node (cabeceras de seguridad). CORS restringido a orígenes explícitos (`CORS_ORIGINS`), nunca wildcard. Contenedores corren como usuario no-root con UID fijo, `capabilities: drop ALL`, sin privilege escalation (ver `k8s/base/*.yaml` y los `Dockerfile`). Los servicios **fallan al arrancar** si falta `JWT_SECRET`/`INTERNAL_SERVICE_TOKEN`/`DATABASE_URL` — nunca corren con un secreto vacío o por defecto (`src/server.js` de cada servicio). `NetworkPolicy` con default-deny en el namespace de Kubernetes. |
| A06 | Vulnerable and Outdated Components | `npm audit --omit=dev` corre en CI por cada servicio; Trivy escanea el filesystem del repo buscando dependencias con CVEs conocidos y sube el reporte a GitHub Code Scanning. Ver "Estado actual de auditoría" abajo para lo que quedó pendiente y por qué. |
| A07 | Identification and Authentication Failures | `bcrypt` (nunca MD5/SHA para contraseñas). Access token de vida corta (15 min) + refresh token revocable (7 días) en vez de un JWT de larga duración imposible de invalidar. Rate limiting específico en endpoints de auth. |
| A08 | Software and Data Integrity Failures | `package-lock.json` committeado y usado con `npm ci` (no `npm install`) en todos los Dockerfiles y en CI — instalaciones reproducibles, no versiones "flotantes". Los Dockerfiles usan tags de imagen base fijos (`node:22-alpine`, `postgres:16-alpine`), no `:latest`. |
| A09 | Security Logging and Monitoring Failures | Logging estructurado con `pino`/`pino-http` en los 3 servicios (JSON, no `console.log`), con redacción explícita de `Authorization`, contraseñas y refresh tokens en los logs. **Limitación honesta**: no hay agregación centralizada (ELK/Loki) ni alertas — en un entorno real esto alimentaría un stack de observabilidad, aquí queda en stdout de cada contenedor. |
| A10 | Server-Side Request Forgery | Las únicas llamadas salientes del sistema (`weather-service` → Open-Meteo) van a hostnames fijos hardcodeados en el código, nunca a una URL construida desde input del usuario — no hay superficie de SSRF ahí. La comunicación entre servicios internos (`weather-service` → `core-api`) usa una URL fija por variable de entorno, no descubrimiento dinámico. |

## Autenticación y autorización — resumen técnico

- **Emisión centralizada, verificación descentralizada**: `auth-service` es el
  único que emite JWT; `core-api` y `weather-service` los verifican de forma
  independiente con el mismo `JWT_SECRET` compartido — no hay una llamada de
  red por cada request para validar el token.
- **Access + refresh**, no un token único de larga duración: si un access
  token se filtra, expira en 15 minutos. Si un refresh token se filtra, se
  puede revocar (`RefreshToken.revoked`) sin invalidar la sesión de nadie más.
- **RBAC mínimo pero real**: campo `role` en `User`, middleware
  `requireRole('ADMIN')`, un endpoint de ejemplo protegido. No hay un sistema
  de permisos granular porque la app no lo necesita — no se construyó uno
  falso solo para la demo.

## Aislamiento entre servicios (defensa en profundidad)

El puerto interno de `core-api` (donde `weather-service` consulta datos de
una finca) está protegido en tres capas independientes, no solo una:

1. **Ni siquiera está enrutado** por el gateway/Ingress público (no existe
   ninguna regla que lo exponga).
2. **Token compartido** (`X-Internal-Token`) que solo conocen `core-api` y
   `weather-service`.
3. **NetworkPolicy de Kubernetes**: a nivel de red, únicamente los pods con
   label `app: weather-service` pueden alcanzar el puerto 4011 de `core-api`
   — verificado en vivo durante el desarrollo (ver `k8s/base/networkpolicy.yaml`
   y `ARCHITECTURE.md`).

De la misma forma, `weather-service` **no tiene forma de conectarse a
Postgres** ni a nivel de código (no tiene el paquete `@prisma/client`
instalado) ni a nivel de red (`NetworkPolicy` solo permite `auth-service` y
`core-api` hacia el puerto 5432).

## Limitaciones conocidas (honestas, no ocultas)

- **Secreto compartido en vez de mTLS**: la comunicación `weather-service` ↔
  `core-api` interno usa un token estático por variable de entorno. En un
  entorno productivo real esto sería mTLS via un service mesh (Istio/Linkerd)
  o JWT de service-account de vida corta (patrón SPIFFE/SPIRE). Se eligió el
  token compartido por ser proporcional a la escala de este proyecto.
- **Postgres compartido físicamente**: `auth-service` y `core-api` apuntan a
  la misma instancia de Postgres, cada uno declarando solo las tablas que le
  pertenecen en su propio `schema.prisma` ("shared database, logical
  ownership"). No hay joins cross-servicio en ningún query, así que separar
  físicamente las bases en el futuro no requeriría cambios de código en los
  controllers — solo en el `DATABASE_URL` de cada uno.
- **Kubernetes Secrets en vez de Vault/External Secrets**: los manifiestos
  usan `Secret` nativos de k8s (base64, no cifrado en reposo por defecto). En
  un clúster real se reemplazaría por Sealed Secrets, External Secrets
  Operator o Vault. `k8s/base/secret.example.yaml` está documentado como
  plantilla, nunca como el secreto real (excluido de git).
- **Sin restricción de egress**: las `NetworkPolicy` incluidas solo
  restringen ingress (quién puede conectarse a cada pod). Restringir egress
  también sería una buena práctica, pero requiere permitir explícitamente DNS
  y las llamadas salientes a Open-Meteo — se dejó fuera para no arriesgar
  romper esa integración por una política mal calibrada.
- **Rate limiting en memoria, no distribuido**: `express-rate-limit` cuenta
  peticiones por proceso. Con 2+ réplicas de un servicio (como en el HPA de
  este proyecto), el límite real efectivo es `N × límite_configurado`. En
  producción esto se resolvería con un store compartido (Redis).

## Estado actual de auditoría de dependencias

Ejecutado en esta sesión (`npm audit --omit=dev` por servicio):

- **`frontend`**: 0 vulnerabilidades en dependencias de producción (Angular
  se actualizó de 21.2.14 a 21.2.18 durante este trabajo específicamente para
  cerrar un bypass de sanitización XSS y varios DoS reportados).
- **`auth-service` / `weather-service` / `core-api`**: 0 vulnerabilidades en
  dependencias de producción. Las que aparecen en `npm audit` sin `--omit=dev`
  son exclusivamente transitivas de **Jest** (herramienta de testing, nunca
  se empaqueta en la imagen de producción — los Dockerfiles corren
  `npm prune --omit=dev` antes de la imagen final).

CI corre este mismo chequeo en cada push/PR (job `security-scan` en
`.github/workflows/ci.yml`) más un escaneo de Trivy, para detectar
regresiones a futuro sin depender de que alguien lo recuerde correr a mano.
