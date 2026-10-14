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
