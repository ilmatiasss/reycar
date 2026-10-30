# Reycar Store — prototipo

Tienda de detailing automotriz. Sitio estático (`index.html`, `styles.css`, `app.js`, `tracking.js`)
más una función de servidor (`api/stock.js`) que lee el stock desde Bsale.

```
node serve.js        # http://localhost:5173  (sirve el sitio y /api/stock)
```

## Conectar Bsale (stock)

La función `api/stock.js` lee el stock con la [API oficial de Bsale](https://docs.bsale.dev/stocks).
El token vive solo en el servidor; nunca llega al navegador.

| Variable | Para qué |
| --- | --- |
| `BSALE_TOKEN` | Token de acceso de Bsale. Sin él, la tienda usa el stock del catálogo. |
| `BSALE_OFFICE_ID` | Sucursal que abastece las ventas web (opcional; sin ella suma todas). |
| `BSALE_API_BASE` | Por defecto `https://api.bsale.io`. |

En Vercel: *Project → Settings → Environment Variables*. Localmente: `BSALE_TOKEN=xxxx node serve.js`.

**Antes de confiar en los datos**, con el token real corre:

```
BSALE_TOKEN=xxxx node scripts/bsale-check.js
```

Muestra una respuesta real de Bsale y cuántos de los 407 productos coinciden por SKU. La forma de la
respuesta (`items[].variant.code`, `quantityAvailable`) se armó según la documentación pública y hay que
confirmarla con ese comando.

Comportamiento: el stock se refresca cada minuto; un producto agotado muestra "Agotado" y no se puede
agregar; el carro nunca supera lo disponible; la web no muestra más de 50 unidades; si Bsale falla, la
tienda sigue con el stock del catálogo.

Pendiente (necesita acceso real a Bsale): precios, emisión de boleta/factura al confirmar el pago y
webhooks para actualizar el stock al instante.

## Medición (Meta Pixel + Google Analytics 4)

`tracking.js` dispara `ViewContent`, `AddToCart`, `InitiateCheckout` y `Purchase` en Meta, y
`view_item`, `add_to_cart`, `begin_checkout` y `purchase` en GA4 (además de PageView, Search, Contact por
clic en WhatsApp y view_cart). Cada evento lleva un `eventID` único para deduplicar con la API de
Conversiones desde el servidor. Los IDs de producto usan el formato `SKU_idProducto`, igual al del sitio actual.

Para activarlo, completar los IDs al inicio de `tracking.js` (`metaPixelId`, `ga4Id`). Mientras estén
vacíos no sale nada hacia Meta ni Google. Con IDs, nada se carga hasta que la persona acepta las cookies.

**Ver los eventos sin cuentas:** abrir `http://localhost:5173/?track=debug`. Aparece un panel con cada
evento y sus datos; "Simular compra" muestra cómo viajaría una compra confirmada.

`Purchase` debe dispararse cuando el pago esté confirmado (desde el servidor), no al cargar una página;
hoy el prototipo no tiene checkout propio, por eso solo se simula en el panel de pruebas.

## Datos del sitio

`build-data.js`, `fetch-logos.js` y `find-logos.js` generan `data/` y `assets/brands/` desde
reycarstore.cl. No se publican (ver `.vercelignore`).

Fotos: `python3 -I scripts/mirror-images.py` las copia a `assets/uploads/` (la tienda ya no las lee del
sitio anterior). `python3 -I scripts/img-fit.py` mide el encuadre de cada una (`data/imgfit.json`) y
`node build-data.js` lo incorpora. Si cambia el catálogo: `build-data.js` → `mirror-images.py` → `img-fit.py`
→ `build-data.js`.

## Direcciones y páginas generadas

La tienda usa direcciones reales (`/tienda?g=pulido`, `/producto/<nombre>`, `/marcas`, `/motor-clean`,
`/asesoria`). Los enlaces antiguos con `#/` se convierten solos. `node scripts/prerender.js` genera una página
por producto y por sección (`producto/*.html`, `tienda.html`…) con título, descripción, imagen y dirección
canónica, más `sitemap.xml` y `robots.txt`: así WhatsApp, Facebook y Google ven cada producto sin ejecutar
JavaScript. **Volver a correrlo cuando cambie `index.html` o el catálogo.** `vercel.json` redirige las direcciones
del sitio anterior (`/shop`, `/marca/…`, `/servicios/…`, `/producto/<nombre>/`) a las nuevas.

**Al pasar al dominio definitivo:** `SITE_URL=https://reycarstore.cl node scripts/prerender.js`, publicar y
enviar `https://reycarstore.cl/sitemap.xml` en Google Search Console.

## Cierre de compra

Mientras se conecta el pago en línea (Klap), "Hacer pedido por WhatsApp" abre WhatsApp con el detalle del
carro: producto, formato, cantidad, precio y SKU de cada línea, subtotal y los datos que faltan (nombre, comuna,
boleta o factura). Se cambia con la constante `CHECKOUT` al inicio de `app.js`.

## Panel de administración (maqueta)

`/admin` (`admin.html`, `assets/admin/`) es una maqueta navegable con la identidad de Reycar, pensada para operar
toda la tienda desde un solo lugar:
- Escritorio con tareas del día y taller de hoy; buscador general (`/`), avisos y atajos de teclado (`?`).
- Pedidos: lista, detalle, imprimir, exportar a Excel, reembolsos totales o parciales con nota de crédito, y
  **pedido manual** (WhatsApp, teléfono o local) con link de pago, transferencia o pago en el local. Despachos.
- Productos: crear, editar nombre y precio, ofertas, ajustes de stock con historial (todo sincronizado con Bsale),
  edición en lote, inventario y reposición, y reseñas con moderación y respuesta.
- Clientes con ficha (historial, segmento, etiquetas, notas, permisos de contacto, exportar o borrar datos).
- Agenda del taller (2 boxes, reservas con validación de horario y patente, estados, servicios y precios).
- Marketing: anuncios y retorno, cupones, correos a clientes con vista previa, carritos, catálogos y píxel.
- Analítica: resumen, tráfico y búsquedas propias (sin depender de GA4) e informe mensual de ventas e IVA.
- Portada, SEO, usuarios con permisos por perfil, registro de actividad y ajustes (Klap, envíos con tarifas
  propias, Bsale, seguimiento, correos y privacidad Ley 21.719).

Sin datos de prueba: los productos, el stock y la revisión de catálogos son los reales; pedidos, clientes,
reservas, reseñas, cupones y campañas parten vacíos, y cada pantalla explica qué aparecerá ahí. Es una vista previa
sin base de datos (aviso "Vista previa · sin conexión"): todo funciona, pero lo creado se pierde al recargar. Los
botones de WhatsApp abren la conversación con el mensaje listo (wa.me). Los pedidos nuevos parten en el N° 1001
(`ORDER_BASE`); al migrar se continúa desde el último número de WooCommerce. No se indexa (`noindex` y robots.txt).
Falta para conectarlo: base de datos, inicio de sesión y las conexiones con Bsale, Klap, Sendu, el envío de correos y
las plataformas de anuncios (al conectar, `CONNECTED = true` cambia los textos de "listo para emitirse" a "emitido").

## Salida a producción

**Ya resuelto:** direcciones reales con vista previa al compartir, sitemap y redirecciones del sitio anterior;
pedido por WhatsApp desde el carro; fotos y logo propios (sin depender del sitio anterior), encabezados de seguridad,
buscadores bloqueados solo en `reycar.vercel.app` (en el dominio real el sitio es indexable), carro y
direcciones a prueba de datos dañados, sin código que falle en iPhones con iOS antiguo, contraste de
colores AA, medición lista (falta cargar los IDs).

**Falta antes de vender (decisiones y datos del cliente):**

1. **Pago en línea (Klap Checkout Flex).** Falta la apikey y la URL de pruebas ("Datos de prueba"), el manual
   de integración y confirmar si aceptan débito Redcompra. Después: formulario de datos, cálculo de despacho,
   aviso de pago firmado y emisión de boleta/factura en Bsale (`POST /v1/documents.json`).
2. **Dominio definitivo** para generar las páginas con `SITE_URL` (ver arriba) y registrar Apple Pay.
3. **Textos legales.** La página "Términos y condiciones" del sitio actual está vacía. Se necesitan los textos
   (términos, privacidad, cambios y devoluciones, despacho) y los datos del proveedor (razón social y RUT).
4. **Medición.** Cargar `metaPixelId` y `ga4Id` en `tracking.js`. `Purchase` debe salir desde el servidor al
   confirmarse el pago (hoy solo se simula en `?track=debug`, y esa simulación no se envía a Meta ni a Google).
5. **Bsale.** Cargar `BSALE_TOKEN` y correr `scripts/bsale-check.js` para confirmar que los SKU coinciden.
   Los precios y productos son una copia del sitio actual: definir de dónde saldrán (Bsale) y cómo se actualizan.
6. **Logos que faltan:** LovCars, Lincoln y Shine (hoy se muestran como texto).
