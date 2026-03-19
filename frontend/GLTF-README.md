# Cómo convertir MAX/3DS a GLTF para la web

## Opción 1: 3ds Max (si tienes la licencia)

### 3ds Max 2023 o superior
- **Archivo → Exportar → Exportar**
- Elige formato **glTF (.gltf)** o **glTF (.glb)**
- **GLB** es más práctico: un solo archivo

### 3ds Max anterior
- Instala el plugin **Babylon.js glTF Exporter**
- Descarga: https://github.com/BabylonJS/Exporters
- Tras instalarlo, exporta desde el menú de Babylon

## Opción 2: Blender (gratis)

1. **Descarga Blender**: https://www.blender.org/

2. **Importar 3DS**:
   - Archivo → Importar → 3D Studio (.3ds)
   - Selecciona tu archivo .3ds

3. **Exportar GLB**:
   - Archivo → Exportar → glTF 2.0 (.glb)
   - Marca "Exportar selección" si solo quieres un objeto
   - Guarda como `.glb`

4. **Para archivos MAX**:
   - Blender no importa .max directamente
   - Necesitas exportar desde 3ds Max a FBX u OBJ primero
   - Luego importa FBX/OBJ en Blender y exporta a GLB

## Opción 3: Convertidores online

- **https://products.aspose.app/3d/conversion** — convierte varios formatos
- **https://imagetostl.com/convert/file/3ds/to/glb** — 3DS a GLB

## Después de convertir

1. Copia el archivo `.glb` a:
   ```
   frontend/public/modelos/
   ```

2. Edita `frontend/src/config/cortes.js`:
   ```js
   export const MODEL_PATH = '/modelos/tu-archivo.glb';
   ```

3. El modelo se mostrará en la sección "Nuestros cortes" de la página de inicio.
