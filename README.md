# ms.restaurante - Sistema de Gestión de Restaurante

## Integrantes
* Silvana Cardona Zapata


## Problema
Actualmente, el restaurante opera sin una aplicación digital centralizada para la toma de pedidos y la gestión de su menú. El proceso se realiza de forma manual o mediante herramientas desconectadas, lo que genera retrasos en la atención, errores en la comanda hacia la cocina y dificultades para actualizar la disponibilidad de los platillos en tiempo real. 

Existe una clara necesidad de migrar la administración analógica del restaurante hacia un ecosistema digital moderno, eficiente y escalable que optimice la comunicación entre clientes, meseros y la cocina.

## Solución Propuesta
Construcción de un sistema basado en **Arquitectura de Microservicios** independientes y desacoplados:
* **ms.usuarios:** Gestión de autenticación, registros y generación de tokens JWT.
* **ms.menu:** Administración del catálogo de platillos y precios.
* **ms.pedidos:** Creación, procesamiento y control de estados de pedidos para cocina ('pendiente', 'en_preparacion', 'servido', 'pagado', 'cancelado').
* **API Gateway:** Punto único de entrada para la validación de JWT y enrutamiento hacia los microservicios.


## Tecnologías Utilizadas
* **Node.js** & **Express**
* **JWT (JSON Web Tokens)** para autenticación y autorización
* **MariaDB** / **XAMPP**
* **Docker Compose** para ejecutar la aplicación completa
* Interfaz web servida por Nginx
* **Git & GitHub** para control de versiones y flujo colaborativo mediante ramas

## Arquitectura por Capas
Cada microservicio implementa la siguiente estructura interna:
`controllers` ➔ `models` ➔ `repositories` ➔ `routes` ➔ `services` / `database` (orquestados por `app.js`)

## Ejecutar la aplicación

1. Copia `.env.example` a `.env` (`cp .env.example .env`). Cambia `JWT_SECRET` por un valor aleatorio largo y define una contraseña propia para `GRAFANA_ADMIN_PASSWORD`.
   `rootpassword` en el ejemplo es solo para desarrollo y coincide con la base del Compose anterior.
   Si ya tienes un volumen de MariaDB, conserva la contraseña con la que se creó; cambiar esta
   variable no cambia automáticamente la contraseña guardada dentro de la base.
   Si ya tenías `.env`, agrega también `GRAFANA_ADMIN_PASSWORD` antes de iniciar Compose.
2. Desde la raíz del proyecto, ejecuta:

   ```bash
   docker compose up --build
   ```

3. Abre `http://localhost:8080` o, en Codespaces, abre el puerto **8080** en el navegador.
   El frontend envía las peticiones a `/api` en el mismo origen; Nginx las reenvía al gateway.

El registro desde la pantalla crea cuentas con rol **cliente**. Para habilitar la administración,
registra tu cuenta y promuévela una sola vez en MariaDB:

```sql
UPDATE usuarios SET rol = 'admin' WHERE email = 'tu-correo@ejemplo.com';
```

Puedes abrir el cliente de MariaDB con `docker compose exec mariadb mariadb -uroot -p`
y escribir la contraseña configurada en `.env`. Luego cierra sesión y vuelve a entrar para
que el token recoja el nuevo rol.

La base de datos se inicializa automáticamente al crear el volumen por primera vez. Si ya tienes
datos en un volumen anterior, consérvalo: no uses `docker compose down -v` salvo que quieras
borrar deliberadamente toda la base.

## Monitoreo y prueba de carga (Fase 4)

Docker Compose incluye Prometheus y Grafana. `ms.usuarios` expone métricas del proceso Node.js
y de sus solicitudes HTTP:

* **Grafana:** abre `http://localhost:3005` (en Codespaces, abre el puerto **3005**).
  Inicia sesión con usuario `admin` y la contraseña de `GRAFANA_ADMIN_PASSWORD`.
  El dashboard **Monitoreo → Monitoreo de ms.usuarios** muestra CPU del proceso Node.js,
  solicitudes por segundo, latencia p95, memoria del proceso y errores HTTP 4xx/5xx.
* **Prometheus:** abre `http://localhost:9090` y revisa **Status → Targets**.
  El target `ms-usuarios` debe aparecer como `UP`.

El endpoint `/metrics` del microservicio de usuarios solo está disponible dentro de la red
de Docker; no se publica como puerto del host ni pasa por el API Gateway. La métrica de CPU
corresponde al proceso Node.js del microservicio y se expresa como porcentaje de un núcleo.
Esto permite observar directamente el trabajo de login (bcrypt) bajo carga sin conceder al
stack de monitoreo acceso privilegiado al daemon de Docker.

Para medir el umbral de degradación de forma contenida, usa `docker-compose.stress.yml`.
Ese archivo limita `ms-usuarios` a 1 CPU y 512 MiB solo durante el ensayo; no cambia
la configuración normal de `docker-compose.yml`. El runner de carga va en otro contenedor,
así que puede comprobar la recuperación aunque el contenedor bajo prueba se reinicie.

Primero crea una cuenta de prueba desde el frontend. Luego, desde la raíz del proyecto,
ejecuta este bloque en una terminal Bash. La contraseña se solicita sin mostrarla:

```bash
read -r -p "Correo de la cuenta de prueba: " STRESS_EMAIL
read -r -s -p "Contraseña de la cuenta de prueba: " STRESS_PASSWORD
printf '\n'
export STRESS_EMAIL STRESS_PASSWORD
docker compose -f docker-compose.yml -f docker-compose.stress.yml \
  --profile stress run --rm \
  -e STRESS_EMAIL -e STRESS_PASSWORD stress-test
stress_status=$?
docker compose up -d ms-usuarios
restore_status=$?
unset STRESS_EMAIL STRESS_PASSWORD
if [ "$restore_status" -ne 0 ]; then exit "$restore_status"; fi
exit "$stress_status"
```

La carga sube por etapas (1, 2, 4, 8, 12, 16, 24 y hasta 32 solicitudes simultáneas), con
un máximo de 8 segundos por etapa y 2,000 solicitudes en total. Se detiene antes de seguir
escalando si la CPU del proceso supera 85% de un núcleo, su memoria RSS llega a 75% del
límite de 512 MiB, la latencia p95 supera 2 segundos o hay errores. La terminal informa
la mayor concurrencia estable, la primera degradación y si el login volvió a responder sin
reinicio manual. El dashboard muestra CPU y memoria del proceso; la memoria se grafica como
porcentaje del límite del ensayo. El ensayo no busca forzar un OOM ni determinar un límite
absoluto: informa el umbral observado bajo estos recursos.

Solo ejecútala contra tu propio entorno local con una cuenta de prueba. En Grafana, selecciona
un rango reciente (por ejemplo, **Last 15 minutes**) y observa los gráficos durante la prueba.
El bloque restaura la configuración normal de `ms-usuarios` al terminar, sin borrar datos.
Si el terminal se cierra a la fuerza antes de ejecutar la restauración, ejecuta
`docker compose up -d ms-usuarios` manualmente.

## Integración continua (GitHub Actions)

El workflow `.github/workflows/ci.yml` se ejecuta en cada `push` a `main` y en cada pull request
dirigido a `main`. Comprueba la sintaxis de JavaScript, valida Docker Compose y construye las cinco
imágenes de la aplicación. Solo los `push` a `main` publican las imágenes con la etiqueta `latest`
en Docker Hub; los pull requests no publican imágenes.

Para habilitar la publicación automática, agrega estos secretos en **GitHub → Settings → Secrets
and variables → Actions**:

* `DOCKERHUB_USERNAME`: usuario de Docker Hub propietario de las imágenes.
* `DOCKERHUB_TOKEN`: un Access Token de Docker Hub con permiso de escritura.

El workflow publica en `ivanascardona/ms-gateway`, `ivanascardona/ms-usuarios`,
`ivanascardona/ms-menu`, `ivanascardona/ms-pedidos` e
`ivanascardona/ms-restaurante-frontend`. El token nunca debe escribirse en el repositorio.