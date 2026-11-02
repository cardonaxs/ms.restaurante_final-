# ms.restaurante - Sistema de Gestión de Restaurante

## Integrantes
* Silvana Cardona Zapata
* Michael Rivera
* Juan Alejandro Cano

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
* **Postman** (para pruebas de API)
* **Git & GitHub** para control de versiones y flujo colaborativo mediante ramas

## Arquitectura por Capas
Cada microservicio implementa la siguiente estructura interna:
`controllers` ➔ `models` ➔ `repositories` ➔ `routes` ➔ `services` / `database` (orquestados por `app.js`)