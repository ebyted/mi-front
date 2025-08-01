# mi_fe

Este proyecto es una PWA en React + Vite para el sistema de inventario. Incluye autenticación JWT, rutas protegidas y ejemplos de CRUD para usuarios, productos, almacenes y órdenes de compra. Estructura modular y lista para conectar con el backend Django.

## Scripts principales
- `npm run dev` — Inicia el servidor de desarrollo
- `npm run build` — Compila la app para producción
- `npm run preview` — Previsualiza la app compilada

## Estructura recomendada
- `/src/pages/` — Pantallas principales
- `/src/components/` — Componentes reutilizables
- `/src/services/` — Conexión a API
- `/src/hooks/` — Custom hooks
- `/src/assets/` — Imágenes, íconos

## PWA
- Manifest y configuración en `vite.config.js` y `public/`

## Conexión backend
- Usa Axios y JWT para consumir los endpoints REST del backend Django.

## Personalización
Sigue las instrucciones en `.github/copilot-instructions.md` para mantener la calidad y estructura del código.

# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
