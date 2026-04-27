# Configuracion de Stripe para desarrollo

Guia para levantar pagos con Stripe Checkout y webhooks en entorno local de TerraShare.

## 1. Objetivo
- Procesar pagos de prueba desde `apps/web`.
- Confirmar pagos via webhook para que el backend actualice:
  - `Payment.status` a `paid`
  - `RentalRequest.status` a `paid`

## 2. Requisitos
- Backend corriendo en `http://localhost:3000`.
- Frontend corriendo en `http://localhost:5173`.
- Stripe CLI instalado.
- Cuenta Stripe en modo test.

## 3. Variables de entorno

### Backend (`apps/backend-api/.env.local`)
```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### Frontend (`apps/web/.env.local`)
```env
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

Nota: si cambias alguna variable, reinicia backend y frontend.

## 4. Levantar Stripe CLI

1. Login en Stripe CLI:
```bash
stripe login
```

2. Iniciar listener para webhooks:
```bash
stripe listen --forward-to localhost:3000/api/v1/webhooks/stripe
```

3. Copiar el `whsec_...` que imprime Stripe CLI.

4. Guardar ese valor en `STRIPE_WEBHOOK_SECRET` del backend y reiniciar API.

## 5. Flujo de prueba recomendado
1. Ir al catalogo y crear una solicitud de alquiler.
2. Desde `Mis solicitudes`, iniciar pago con tarjeta.
3. Completar el checkout en Stripe.
4. Verificar que en consola de Stripe CLI aparezca:
   - `checkout.session.completed`
   - respuesta `200` del webhook
5. Refrescar dashboard y validar:
   - desaparece boton `Pagar con tarjeta`
   - estado visible como `Pagada` o `Pago confirmado`

## 6. Tarjetas de prueba
- Exitoso: `4242 4242 4242 4242`
- Declinada: `4000 0000 0000 0002`
- Fondos insuficientes: `4000 0000 0000 9995`

Campos restantes:
- Exp: cualquier fecha futura
- CVC: cualquier 3 digitos
- ZIP: cualquier valor

## 7. Tiempos esperados
- Actualizacion normal: 1 a 10 segundos.
- Si tarda mas de 30 segundos, revisar troubleshooting.

## 8. Troubleshooting

### Caso A: Stripe CLI muestra `401`
Causa comun:
- Validacion de firma fallida en backend.

Checklist:
1. Confirmar `whsec_...` de Stripe CLI coincide con `.env.local`.
2. Reiniciar backend despues de cambiar `.env.local`.
3. Verificar que webhook apunta a `localhost:3000/api/v1/webhooks/stripe`.

### Caso B: Stripe marca pago exitoso pero app sigue en `pending_payment`
Causa comun:
- Webhook no llego o no pudo reconciliar el pago.

Accion:
1. Revisar logs de backend para errores de webhook.
2. Reenviar webhook manual usando `stripeSessionId` del pago pendiente:
```bash
curl -X POST http://localhost:3000/api/v1/webhooks/stripe \
  -H "Content-Type: application/json" \
  -d '{"type":"checkout.session.completed","data":{"object":{"id":"<stripeSessionId>","metadata":{}}}}'
```

### Caso C: no hay eventos en Stripe CLI
Causa comun:
- Listener detenido.

Accion:
- Volver a ejecutar:
```bash
stripe listen --forward-to localhost:3000/api/v1/webhooks/stripe
```

## 9. Validacion API rapida

Consultar pagos del usuario dev:
```bash
curl -s "http://localhost:3000/api/v1/payments" \
  -H "x-dev-user-id: web_dev_user" \
  -H "x-dev-role: user"
```

Consultar solicitudes del usuario dev:
```bash
curl -s "http://localhost:3000/api/v1/rental-requests" \
  -H "x-dev-user-id: web_dev_user" \
  -H "x-dev-role: user"
```

## 10. Estado final esperado
- Payment en `paid`
- Rental request en `paid`
- UI sin boton de pago para esa solicitud
