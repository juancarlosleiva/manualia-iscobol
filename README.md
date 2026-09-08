# Manualia isCOBOL

Buscador estático de manuales isCOBOL, diseñado para publicarse gratuitamente con GitHub Pages.

## Uso local

1. Ejecuta `powershell -ExecutionPolicy Bypass -File .\build-data.ps1` para copiar los TXT a `manuales/` y generar el índice.
2. Sirve esta carpeta con un servidor web (por ejemplo, `npx serve .`) y abre la URL local.

La aplicación busca todo el contenido en el navegador. El botón **Consultar en ChatGPT** copia un prompt con el fragmento del manual y abre ChatGPT; así funciona con una cuenta gratuita sin exponer una clave API.

## Publicación

En GitHub: `Settings` → `Pages` → selecciona la rama `main` y la carpeta raíz. GitHub publicará la web en la URL indicada allí.

> Los TXT se incluyen en el repositorio. Verifica que tu licencia permita compartirlos en un repositorio público. Si no, crea un repositorio privado; GitHub Pages público no debe usarse para documentación con acceso restringido.
