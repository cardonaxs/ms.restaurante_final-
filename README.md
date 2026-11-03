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

1. Copia `.env.example` a `.env` (`cp .env.example .env`). Cambia `JWT_SECRET` por un valor aleatorio largo.
   `rootpassword` en el ejemplo es solo para desarrollo y coincide con la base del Compose anterior.
   Si ya tienes un volumen de MariaDB, conserva la contraseña con la que se creó; cambiar esta
   variable no cambia automáticamente la contraseña guardada dentro de la base.
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