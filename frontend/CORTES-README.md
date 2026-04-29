# Cómo añadir tus imágenes de cortes

## Paso 1: Extraer el RAR

Descomprime tu archivo RAR (con 7-Zip, WinRAR, etc.) en una carpeta temporal.

## Paso 2: Copiar los PNG

Copia **solo los archivos PNG** (y JPG si los tienes) a:

```
frontend/public/cortes/
```

Los archivos **TGA, MAX y 3DS** no se usan en la web:
- **TGA**: Son texturas; conviértelas a PNG si las necesitas
- **MAX / 3DS**: Son modelos 3D de 3ds Max; para web hay que exportar a GLB

## Paso 3: Generar la lista

En la terminal, desde la carpeta `frontend`:

```bash
npm run list-cortes
```

Copia la salida que aparece.

## Paso 4: Pegar en la config

Abre `frontend/src/shared/utils/cortes.js` y pega el contenido generado (reemplaza el array `CORTES`).

## Resultado

Las imágenes aparecerán en la sección "Nuestros cortes" de la página de inicio en un carrusel interactivo.
