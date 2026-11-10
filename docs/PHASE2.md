# Growth X-Ray — Fase 2: borrador de preguntas y mini-hallazgos

> **Estado: BORRADOR, pendiente de aprobación.** Las decisiones aprobadas están en `docs/SPEC.md` §4. Cuando se aprueben
> estos textos, pasan tal cual a `config/phase2.config.json` (EN) y `config/phase2.config.es.json` (ES).

Convenciones:
- `scores` → pilares que ve el prospecto (0-100, promedio de aportes). `team.*` → solo vista del equipo.
- Una opción sin puntaje no aporta (p. ej. "no aplica a mi negocio").
- `multi` = elige todas las que apliquen; las `multi` no puntúan (como `channels` en la fase 1): alimentan hallazgos,
  el informe y el panel.
- Mini-hallazgo: gana la **primera** regla que se cumple; la última es `"*"`. `p1.<id>` = respuesta de la fase 1;
  `P1.<pilar>` = pilar de la fase 1.
- Ninguna cifra sin fuente. Las únicas cifras con fuente están en §Evidencia.

---

## Bloque 1 · Customer journey (`journey`)

**Intro** — EN: "First, the path a customer takes, from first message to paid." · ES: "Primero, el camino de un cliente,
desde el primer mensaje hasta el pago."

**`j_steps`** (single)
- EN: "Think about your most recent new customer. From their first message to paying you, how many steps did it take?"
  Sub: "A step is anything they had to wait for: a call back, a visit, a quote, an approval, a date, an invoice."
- ES: "Piensa en tu cliente nuevo más reciente. Desde su primer mensaje hasta que te pagó, ¿cuántos pasos hubo?"
  Sub: "Un paso es todo lo que tuvo que esperar: una llamada de vuelta, una visita, una cotización, una aprobación, una
  fecha, una factura."

| id | EN | ES | Puntaje |
|---|---|---|---|
| `1_2` | 1 or 2 | 1 o 2 | visibility 75 |
| `3_4` | 3 or 4 | 3 o 4 | visibility 75 |
| `5p` | 5 or more | 5 o más | visibility 70 · flag `longJourney` |
| `varies` | It changes every time | Cambia cada vez | visibility 30, pipeline 35 |

**`j_stuck`** (single)
- EN: "Where do you lose the most people along the way?"
- ES: "¿En qué parte del camino pierdes a más gente?"

| id | EN | ES | Puntaje |
|---|---|---|---|
| `reply` | Before we get back to them | Antes de que les respondamos | visibility 70 · `stuckReply` |
| `quote` | After they get a quote | Después de recibir la cotización | visibility 70 · `stuckQuote` |
| `schedule` | When it's time to pick a date | Al momento de agendar | visibility 70 · `stuckSchedule` |
| `price` | When they hear the price | Cuando escuchan el precio | visibility 70 · `stuckPrice` |
| `rare` | We rarely lose anyone once they reach out | Casi nunca perdemos a alguien que ya nos contactó | visibility 60 |
| `dk` | I don't really know | La verdad, no lo sé | visibility 15 · `stuckUnknown` |

**`j_after`** (single)
- EN: "The job is done and paid. What happens next with that customer?"
- ES: "El trabajo está hecho y pagado. ¿Qué pasa después con ese cliente?"

| id | EN | ES | Puntaje |
|---|---|---|---|
| `plan` | They're on a plan: the next visit or reminder is already scheduled | Queda en un plan: la próxima visita o recordatorio ya está agendado | retention 95 |
| `checkin` | We check in after a while | Lo contactamos después de un tiempo | retention 70 |
| `review` | We ask for a review, and that's usually the last contact | Le pedimos una reseña y suele ser el último contacto | retention 35, reputation 70 |
| `nothing` | Nothing, unless they call us | Nada, salvo que nos llame | retention 15 |
| `once` | Our work is usually a one-time job | Nuestro trabajo suele ser de una sola vez | retention 50 · `oneTime` |

**Mini-hallazgos**
1. `j_stuck = dk`
   - EN: "You don't know yet where people drop off. That's common, and it's the first thing to make visible: you can't fix a step you can't see."
   - ES: "Todavía no sabes en qué paso se va la gente. Es lo más común, y es lo primero que hay que hacer visible: no se puede arreglar un paso que no se ve."
2. `j_stuck = quote` y `p1.followup ∈ {once, wait}` *(ajustado)*. El pilar `followup` de la fase 1 sale solo de esa
   pregunta (auto 100, set 75, once 35, wait 10), así que `followup ≤ 35` equivale exactamente a "We follow up once, if
   someone remembers" o "We wait for them to come back". La regla usa las dos respuestas, no el número, y el texto solo
   repite lo que la persona dijo.
   - EN: "This lines up with your Phase 1 answer: when a quote goes quiet, it gets one follow-up at most. And you told us that's where you lose the most people."
   - ES: "Coincide con lo que respondiste en la fase 1: cuando una cotización queda sin respuesta, recibe como mucho un seguimiento. Y nos dijiste que ahí es donde pierdes a más gente."
3. `j_stuck = reply` y `P1.access` ≤ cada uno de los otros pilares de la fase 1 con puntaje (empates incluidos) *(ajustado)*
   - EN: "This lines up with Phase 1: people drop off before the first reply, and first response came out at the bottom of your Phase 1 scores."
   - ES: "Coincide con la fase 1: la gente se va antes de la primera respuesta, y la primera respuesta quedó al fondo de tus puntajes de la fase 1."
4. `j_steps = 5p`
   - EN: "Your customers go through 5 or more steps before paying. Each wait is a chance to drop off; your plan will show which ones can be shortened."
   - ES: "Tus clientes pasan por 5 pasos o más antes de pagar. Cada espera es una oportunidad de irse; tu plan mostrará cuáles se pueden acortar."
5. `j_after = nothing`
   - EN: "After the sale, the relationship ends unless the customer calls. Block 3 looks at what that's worth."
   - ES: "Después de la venta, la relación termina salvo que el cliente llame. El bloque 3 mira cuánto vale eso."
6. `"*"`
   - EN: "You have a clear picture of the journey. The next blocks look at what happens at each stage."
   - ES: "Tienes claro el recorrido. Los bloques siguientes miran qué pasa en cada etapa."

---

## Bloque 2 · Pipeline & follow-up (`pipeline`)

**Intro** — EN: "Now, the quotes and deals that are still open." · ES: "Ahora, las cotizaciones y ventas que siguen abiertas."

**`p_open`** (single)
- EN: "Right now, how many quotes or proposals are waiting on an answer from the customer?"
- ES: "En este momento, ¿cuántas cotizaciones o propuestas esperan una respuesta del cliente?"

| id | EN | ES | Puntaje |
|---|---|---|---|
| `lt5` | Fewer than 5 | Menos de 5 | pipeline 75 |
| `5_20` | 5 to 20 | De 5 a 20 | pipeline 75 |
| `20p` | More than 20 | Más de 20 | pipeline 75 |
| `dk` | I'd have to go look | Tendría que ir a revisar | pipeline 25 · `openUnknown` |

**`p_value`** (single)
- EN: "Do you know the total dollar value of those open quotes?"
- ES: "¿Sabes cuánto suman en dólares esas cotizaciones abiertas?"

| id | EN | ES | Puntaje |
|---|---|---|---|
| `exact` | Yes, I could tell you the number now | Sí, te podría decir la cifra ahora | visibility 90, pipeline 90 |
| `rough` | Roughly | Más o menos | visibility 55, pipeline 60 |
| `no` | No | No | visibility 20, pipeline 20 |

**`p_lost`** (single)
- EN: "When you lose a sale, do you write down why?"
- ES: "Cuando pierdes una venta, ¿anotas por qué?"

| id | EN | ES | Puntaje |
|---|---|---|---|
| `always` | Every time, in one place | Siempre, en un solo lugar | visibility 90 |
| `some` | Sometimes | A veces | visibility 50 |
| `know` | No, but I usually know why | No, pero casi siempre sé por qué | visibility 30 |
| `no` | No | No | visibility 15 |

**`p_owner`** (single)
- EN: "Who is responsible for moving each open quote forward?"
- ES: "¿Quién se encarga de hacer avanzar cada cotización abierta?"

| id | EN | ES | Puntaje |
|---|---|---|---|
| `named` | A specific person for each one | Una persona definida para cada una | pipeline 90, owner 80 |
| `me` | Me | Yo | pipeline 60, owner 20 |
| `whoever` | Whoever has time | Quien tenga tiempo | pipeline 30, owner 50 |
| `nobody` | Nobody in particular | Nadie en particular | pipeline 10, owner 40 |

**Mini-hallazgos**
1. `p_value = no` y `p_open ∈ {5_20, 20p}`
   - EN: "You have quotes waiting and no total for them. That's money already in play that nobody is watching as a whole."
   - ES: "Tienes cotizaciones esperando y no sabes cuánto suman. Es dinero que ya está en juego y que nadie mira en conjunto."
2. `p_owner = me` y `p1.away ∈ {stop, cant}`
   - EN: "This lines up with Phase 1: open quotes depend on you, and so do new sales when you're away."
   - ES: "Coincide con la fase 1: las cotizaciones abiertas dependen de ti, igual que las ventas nuevas cuando no estás."
3. `p_lost ∈ {know, no}`
   - EN: "Lost sales aren't written down, so the reasons stay as hunches. A short list of reasons is often enough to spot a pattern."
   - ES: "Las ventas perdidas no se anotan, así que los motivos quedan como corazonadas. Una lista corta de motivos suele bastar para ver un patrón."
4. `"*"`
   - EN: "You keep track of what's open. Next: what happens after a customer buys."
   - ES: "Llevas control de lo que está abierto. Sigue: qué pasa después de que un cliente compra."

---

## Bloque 3 · Retention & LTV (`retention`)

**Intro** — EN: "Next, the customers you already have." · ES: "Ahora, los clientes que ya tienes."

**`r_repeat`** (single) — insight: evidencia `reichheld` (ya está en la fase 1)
- EN: "How often does a typical customer buy from you again?"
- ES: "¿Cada cuánto te vuelve a comprar un cliente típico?"

| id | EN | ES | Puntaje |
|---|---|---|---|
| `often` | Several times a year | Varias veces al año | retention 90 |
| `yearly` | About once a year | Más o menos una vez al año | retention 70 |
| `years` | Every few years | Cada algunos años | retention 45 |
| `once` | Usually just once | Casi siempre una sola vez | retention 30 |
| `dk` | I don't know | No lo sé | retention 15 · `repeatUnknown` |

**`r_remind`** (single)
- EN: "Do you remind customers when it's time for a renewal, maintenance or their next visit?"
- ES: "¿Les recuerdas a tus clientes cuando toca una renovación, un mantenimiento o su próxima visita?"

| id | EN | ES | Puntaje |
|---|---|---|---|
| `auto` | Yes, automatically | Sí, de forma automática | retention 95 |
| `manual` | Yes, when we remember | Sí, cuando nos acordamos | retention 50 |
| `no` | No | No | retention 15 |
| `na` | That doesn't apply to my business | No aplica a mi negocio | — |

**`r_list`** (single)
- EN: "Could you send a message today to everyone who bought from you in the last two years?"
- ES: "¿Podrías mandarle hoy un mensaje a todos los que te compraron en los últimos dos años?"

| id | EN | ES | Puntaje |
|---|---|---|---|
| `yes` | Yes, I have a list with their contact info | Sí, tengo una lista con sus datos | retention 90 |
| `partly` | Some of them; it's spread across my phone, email and invoices | A algunos; los datos están repartidos entre el teléfono, el correo y las facturas | retention 45 |
| `no` | No | No | retention 10 |

**`r_referrals`** (single) — insight: evidencia `schmitt2011` (nueva, verificada)
- EN: "How do new referrals happen?"
- ES: "¿Cómo te llegan los referidos?"

| id | EN | ES | Puntaje |
|---|---|---|---|
| `process` | We ask every customer, the same way each time | Se los pedimos a cada cliente, siempre de la misma forma | retention 95 |
| `some` | We ask now and then | Los pedimos de vez en cuando | retention 55 |
| `own` | They happen on their own | Llegan solos | retention 25 |
| `rare` | We rarely get referrals | Casi no recibimos referidos | retention 15 |

**`r_extras`** (single) — solo situación `offer`
- EN: "Do you offer anything beyond your main service, like plans, packages or add-ons?"
- ES: "¿Ofreces algo además de tu servicio principal, como planes, paquetes o extras?"

| id | EN | ES | Puntaje |
|---|---|---|---|
| `taken` | Yes, and many customers take them | Sí, y muchos clientes los toman | retention 85 |
| `few` | Yes, but few customers take them | Sí, pero pocos clientes los toman | retention 55 |
| `no` | No | No | retention 30 · `noExtras` |

**Mini-hallazgos**
1. `r_list = no`
   - EN: "There's no list of past customers you could reach today. They already trust you, and right now there's no way to contact them all at once."
   - ES: "No tienes una lista de clientes anteriores a la que puedas escribir hoy. Ya confían en ti, y por ahora no hay forma de contactarlos a todos a la vez."
2. `r_remind ∈ {manual, no}` y `r_repeat ∈ {often, yearly}`
   - EN: "Customers come back, but the reminder depends on memory or doesn't happen. Repeat business is happening without a system behind it."
   - ES: "Los clientes vuelven, pero el recordatorio depende de la memoria o no existe. La recompra pasa sin un sistema detrás."
3. `r_extras = no` (solo `offer`)
   - EN: "Your numbers point to value per customer, and there's nothing beyond the main service yet. Your plan looks at what could be added before bringing in more people."
   - ES: "Tus números apuntan al valor por cliente, y todavía no hay nada además del servicio principal. Tu plan mira qué se podría sumar antes de traer más gente."
4. `r_referrals ∈ {own, rare}`
   - EN: "Referrals depend on luck. Asking every customer, the same way each time, turns them into something you can count on."
   - ES: "Los referidos dependen de la suerte. Pedírselos a cada cliente, siempre igual, los vuelve algo con lo que puedes contar."
5. `"*"`
   - EN: "Your past customers are an active part of the business. Next: reviews and proof."
   - ES: "Tus clientes anteriores son una parte activa del negocio. Sigue: reseñas y pruebas."

---

## Bloque 4 · Reviews & proof (`reviews`)

**Intro** — EN: "Now, what people see before they choose you." · ES: "Ahora, lo que la gente ve antes de elegirte."

**`v_respond`** (single) — insight: evidencia `brightlocal2026b` (ya está en la fase 1)
- EN: "When a new review comes in, what do you do?"
- ES: "Cuando llega una reseña nueva, ¿qué haces?"

| id | EN | ES | Puntaje |
|---|---|---|---|
| `all` | We reply to all of them | Respondemos todas | reputation 95 |
| `bad` | We reply only to the bad ones | Solo respondemos las malas | reputation 55 |
| `none` | We don't reply | No respondemos | reputation 20 |
| `unseen` | I don't always see them | No siempre las veo | reputation 15 |

**`v_ask`** (single) — insight: tarjeta `ftc2024` (nueva, verificada)
- EN: "When you ask for reviews, who gets asked?"
- ES: "Cuando pides reseñas, ¿a quién se las pides?"

| id | EN | ES | Puntaje |
|---|---|---|---|
| `all` | Every customer | A todos los clientes | reputation 90 |
| `happy` | Only the customers we think are happy | Solo a los clientes que creemos que quedaron contentos | reputation 40 · `reviewGating` |
| `none` | We don't ask | No las pedimos | reputation 15 |

**`v_proof`** (single)
- EN: "Beyond star ratings, do you have proof like video testimonials or case studies with real results?"
- ES: "Además de las estrellas, ¿tienes pruebas como testimonios en video o casos con resultados reales?"

| id | EN | ES | Puntaje |
|---|---|---|---|
| `several` | Yes, several | Sí, varios | reputation 90 |
| `few` | One or two | Uno o dos | reputation 60 |
| `no` | No | No | reputation 20 |

**`v_use`** (single)
- EN: "Where do customers see your reviews or testimonials before they buy?"
- ES: "¿Dónde ven tus clientes las reseñas o testimonios antes de comprar?"

| id | EN | ES | Puntaje |
|---|---|---|---|
| `ours` | On our website, quotes or ads | En nuestra web, cotizaciones o anuncios | reputation 90 |
| `sites` | Only on Google or review sites | Solo en Google o en sitios de reseñas | reputation 45 |
| `nowhere` | Nowhere that we control | En ningún lugar que manejemos nosotros | reputation 20 |

**Mini-hallazgos**
1. `v_ask = happy`
   - EN: "Asking only the customers you think are happy can tilt your reviews. The FTC says this practice could violate the FTC Act. Asking everyone is safer and more credible."
   - ES: "Pedir reseñas solo a quienes crees que quedaron contentos puede sesgar tus reseñas. La FTC dice que esa práctica podría violar la ley de la FTC. Pedírselas a todos es más seguro y más creíble."
2. `v_respond ∈ {none, unseen}`
   - EN: "New reviews go unanswered. People reading them also read your replies, so each reply shows that someone is listening."
   - ES: "Las reseñas nuevas quedan sin respuesta. Quien las lee también lee tus respuestas, así que cada respuesta muestra que alguien escucha."
3. `v_use ∈ {sites, nowhere}` y `v_proof ≠ no`
   - EN: "You have proof, but it stays on review sites. Showing it where people decide, like your quote or your site, costs nothing extra."
   - ES: "Tienes pruebas, pero se quedan en los sitios de reseñas. Mostrarlas donde la gente decide, como tu cotización o tu web, no cuesta nada extra."
4. `"*"`
   - EN: "Your proof is working for you. Next: your marketing history."
   - ES: "Tus pruebas trabajan para ti. Sigue: tu historia con el marketing."

---

## Bloque 5 · Advertising & marketing history (`marketing`)

**Intro** — EN: "Now, what you've tried to bring in customers." · ES: "Ahora, lo que has probado para atraer clientes."

**`a_channels`** (multi, sin puntaje)
- EN: "Besides referrals, where have new customers come from in the last year?" Sub: "Pick all that apply."
- ES: "Además de los referidos, ¿de dónde llegaron clientes nuevos en el último año?" Sub: "Elige todas las que apliquen."

| id | EN | ES |
|---|---|---|
| `gads` | Google search ads | Anuncios en Google |
| `lsa` | Google Local Services Ads | Google Local Services Ads |
| `gbp` | Our Google Business Profile | Nuestro perfil de Google Business |
| `meta` | Facebook or Instagram ads | Anuncios en Facebook o Instagram |
| `leadsites` | Angi, Thumbtack, Yelp or similar | Angi, Thumbtack, Yelp o similares |
| `seo` | Our website showing up on Google | Nuestra web apareciendo en Google |
| `offline` | Mail, print, radio or events | Correo postal, impresos, radio o eventos |
| `none` | None of these | Ninguna de estas |

**`a_agency`** (single, sin puntaje) — insight: mito `marketing` (ya está) si `past_bad`
- EN: "Have you worked with a marketing agency or freelancer?"
- ES: "¿Has trabajado con una agencia o un freelancer de marketing?"

| id | EN | ES | Flag |
|---|---|---|---|
| `now` | Yes, we work with one now | Sí, trabajamos con uno ahora | — |
| `good` | Yes, and it went well | Sí, y nos fue bien | — |
| `bad` | Yes, and it didn't go well | Sí, y no nos fue bien | `burnedByAgency` |
| `never` | No | No | — |

**`a_attrib`** (single)
- EN: "When a new customer comes in, do you know which ad or channel brought them?"
- ES: "Cuando llega un cliente nuevo, ¿sabes qué anuncio o canal lo trajo?"

| id | EN | ES | Puntaje |
|---|---|---|---|
| `track` | Yes, we track it for every customer | Sí, lo registramos con cada cliente | visibility 95 |
| `ask` | We ask, but don't write it down | Le preguntamos, pero no lo anotamos | visibility 45 |
| `idea` | We have a rough idea | Tenemos una idea aproximada | visibility 30 |
| `no` | No | No | visibility 10 |

**`a_tried`** (multi, sin puntaje) — solo situación `demand` *(cambio frente al plan: se **agrega** en vez de reemplazar
a `a_attrib`, porque saber de dónde viene cada cliente también sirve sin anuncios, p. ej. referidos frente a Google)*
- EN: "What have you tried to get more inquiries?" Sub: "Pick all that apply."
- ES: "¿Qué has probado para conseguir más consultas?" Sub: "Elige todas las que apliquen."

| id | EN | ES |
|---|---|---|
| `ads` | Paid ads | Anuncios pagados |
| `profile` | Improving our Google profile | Mejorar nuestro perfil de Google |
| `referrals` | Asking for referrals | Pedir referidos |
| `social` | Posting on social media | Publicar en redes sociales |
| `partners` | Partnerships with other businesses | Alianzas con otros negocios |
| `nothing` | Nothing yet | Nada todavía |

**Mini-hallazgos**
1. `p1.ads ≠ 0` y `a_attrib ∈ {idea, no}`
   - EN: "You pay for ads but can't tell which one brings customers. Until that's measured, any change to the budget is a guess."
   - ES: "Pagas anuncios, pero no sabes cuál trae clientes. Mientras no se mida, cualquier cambio en el presupuesto es a ciegas."
2. `a_agency = bad` y (`P1.access` < 55 o `P1.followup` < 55)
   - EN: "Part of what didn't work may have happened after the click: in Phase 1, first response or follow-up came out weak. That part usually gets blamed on the ads."
   - ES: "Parte de lo que no funcionó pudo pasar después del clic: en la fase 1, la primera respuesta o el seguimiento salieron débiles. Esa parte casi siempre se le achaca a los anuncios."
3. situación `demand` y `a_tried` incluye `nothing`
   - EN: "You haven't tried anything yet to get more inquiries. That's where your plan starts, before any new system."
   - ES: "Todavía no has probado nada para conseguir más consultas. Ahí empieza tu plan, antes de cualquier sistema nuevo."
4. `"*"`
   - EN: "That's your marketing history. Next: how well you can see your own numbers."
   - ES: "Esa es tu historia con el marketing. Sigue: qué tan bien ves tus propios números."

---

## Bloque 6 · Visibility & forecasting (`visibility`)

**Intro** — EN: "Now, the numbers you use to make decisions." · ES: "Ahora, los números con los que tomas decisiones."

**`f_close`** (single)
- EN: "Do you know your close rate, meaning how many out of every 10 quotes become customers?"
- ES: "¿Sabes tu tasa de cierre, es decir, cuántas de cada 10 cotizaciones se vuelven clientes?"

| id | EN | ES | Puntaje |
|---|---|---|---|
| `measured` | Yes, we measure it | Sí, la medimos | visibility 95 |
| `estimate` | I have an estimate | Tengo una estimación | visibility 50 |
| `no` | No | No | visibility 15 |

**`f_cac`** (single)
- EN: "Do you know how much it costs you to get one new customer?"
- ES: "¿Sabes cuánto te cuesta conseguir un cliente nuevo?"

| id | EN | ES | Puntaje |
|---|---|---|---|
| `channel` | Yes, for each channel | Sí, por cada canal | visibility 95 |
| `overall` | Yes, as an overall average | Sí, como promedio general | visibility 70 |
| `rough` | Roughly | Más o menos | visibility 40 |
| `no` | No | No | visibility 10 |

**`f_forecast`** (single)
- EN: "Could you predict next quarter's revenue within about 20%?"
- ES: "¿Podrías estimar los ingresos del próximo trimestre con un margen de error de un 20 %?"

| id | EN | ES | Puntaje |
|---|---|---|---|
| `yes` | Yes, from the quotes and bookings we have | Sí, con las cotizaciones y reservas que tenemos | visibility 95 |
| `gut` | Only as a gut feeling | Solo por intuición | visibility 35 |
| `no` | No | No | visibility 10 |

**`f_review`** (single)
- EN: "How often do you look at these numbers?"
- ES: "¿Cada cuánto miras estos números?"

| id | EN | ES | Puntaje |
|---|---|---|---|
| `weekly` | Every week | Cada semana | visibility 95 |
| `monthly` | Every month | Cada mes | visibility 75 |
| `problem` | When something goes wrong | Cuando algo sale mal | visibility 30 |
| `never` | Hardly ever | Casi nunca | visibility 10 |

**Mini-hallazgos**
1. `f_close ∈ {estimate, no}` — `{closeOf10}` = lo que puso en la calculadora de la fase 1
   - EN: "In Phase 1 you estimated that {closeOf10} out of 10 buy. Without measuring it, that number can't tell you whether a change helped."
   - ES: "En la fase 1 estimaste que compran {closeOf10} de cada 10. Si no se mide, ese número no te dice si un cambio funcionó."
2. `f_forecast ∈ {gut, no}` y `f_cac ∈ {rough, no}`
   - EN: "Revenue and cost per customer are both estimates today. That's what makes it hard to decide how much to invest in growth."
   - ES: "Hoy los ingresos y el costo por cliente son estimaciones. Eso es lo que hace difícil decidir cuánto invertir para crecer."
3. `f_review ∈ {problem, never}`
   - EN: "The numbers get checked when something goes wrong. By then, the problem has usually been there for a while."
   - ES: "Los números se revisan cuando algo sale mal. Para entonces, el problema casi siempre lleva un tiempo ahí."
4. `"*"`
   - EN: "You can see your numbers. Next: who would run the changes."
   - ES: "Ves tus números. Sigue: quién se encargaría de los cambios."

---

## Bloque 7 · Team & capacity (`team`)

**Intro** — EN: "Now, who would make this work day to day." · ES: "Ahora, quién haría que esto funcione en el día a día."

**`t_runner`** (single)
- EN: "If a new system started tomorrow, who would handle it day to day?"
- ES: "Si mañana arrancara un sistema nuevo, ¿quién lo manejaría en el día a día?"

| id | EN | ES | Puntaje | team.capacity |
|---|---|---|---|---|
| `person` | A specific person on the team | Una persona definida del equipo | readiness 85, owner 80 | 90 |
| `me` | Me | Yo | readiness 45, owner 20 | 45 |
| `hire` | We'd need to hire someone | Tendríamos que contratar a alguien | readiness 35 | 35 |
| `nobody` | Nobody has time for that right now | Ahora nadie tiene tiempo para eso | readiness 15 · `noRunner` | 15 |

**`t_absorb`** (single)
- EN: "If you got 30% more customers next month, could you serve them well?"
- ES: "Si el mes que viene tuvieras un 30 % más de clientes, ¿podrías atenderlos bien?"

| id | EN | ES | Puntaje | team.capacity |
|---|---|---|---|---|
| `yes` | Yes, we have room | Sí, tenemos espacio | readiness 90 | 90 |
| `tight` | Yes, but it'd be tight | Sí, pero muy justo | readiness 60 | 60 |
| `no` | No, we're at capacity | No, estamos al tope | readiness 20 · `atCapacity` | 20 |

**`t_hours`** (single)
- EN: "How many hours a week do you personally spend on sales and replying to inquiries?"
- ES: "¿Cuántas horas a la semana dedicas tú a vender y a responder consultas?"

| id | EN | ES | Puntaje |
|---|---|---|---|
| `lt5` | Under 5 | Menos de 5 | owner 85 |
| `5_15` | 5 to 15 | De 5 a 15 | owner 55 |
| `15p` | More than 15 | Más de 15 | owner 25 |

**`t_who`** (single, sin puntaje; solo panel)
- EN: "Who is answering this diagnostic?"
- ES: "¿Quién está respondiendo este diagnóstico?"

| id | EN | ES | Flag |
|---|---|---|---|
| `owner` | The owner | El dueño o la dueña | — |
| `partner` | A partner or co-owner | Un socio o socia | — |
| `manager` | A manager | Un gerente o encargado | `notOwner` |
| `staff` | Someone else on the team | Otra persona del equipo | `notOwner` |

**Mini-hallazgos**
1. `t_absorb = no`
   - EN: "You're at capacity. More inquiries won't help yet; your plan has to start with what frees up time."
   - ES: "Estás al tope. Más consultas todavía no ayudan; tu plan tiene que empezar por lo que libera tiempo."
2. `t_runner ∈ {me, nobody}`
   - EN: "A new system would land on you. That's why your plan has to cover who runs it, not just which tool."
   - ES: "Un sistema nuevo caería sobre ti. Por eso tu plan tiene que decir quién lo maneja, no solo qué herramienta usar."
3. `t_hours = 15p`
   - EN: "You spend more than 15 hours a week on sales and replies. That's the time a system gives back first."
   - ES: "Dedicas más de 15 horas a la semana a vender y responder. Ese es el tiempo que un sistema te devuelve primero."
4. `"*"`
   - EN: "You have people and room to take on more. Last block: what you've tried before and what's next."
   - ES: "Tienes gente y espacio para crecer. Último bloque: lo que ya probaste y lo que sigue."

---

## Bloque 8 · Technology history & readiness (`tech`)

Único bloque con preguntas de decisión y presupuesto (`kind`).

**Intro** — EN: "Last block: what you've tried and what would make sense now." · ES: "Último bloque: lo que ya
probaste y lo que tendría sentido ahora."

**`k_tools`** (multi, sin puntaje)
- EN: "Which of these have you tried in the past?" Sub: "Pick all that apply."
- ES: "¿Cuáles de estas cosas has probado antes?" Sub: "Elige todas las que apliquen."

| id | EN | ES |
|---|---|---|
| `crm` | A CRM | Un CRM |
| `booking` | Online booking | Reservas en línea |
| `auto` | Automatic texts or emails | Mensajes de texto o correos automáticos |
| `answering` | An answering service or virtual receptionist | Un servicio de contestador o recepcionista virtual |
| `agencytool` | Software an agency set up for us | Un software que nos instaló una agencia |
| `none` | None of these | Ninguna de estas |

**`k_why`** (single) — solo si `k_tools` no es `none` *(condicional por respuesta: nueva, ver SPEC §4)*
- EN: "If you stopped using any of them, what was the main reason?"
- ES: "Si dejaste de usar alguna, ¿cuál fue el motivo principal?"

| id | EN | ES | Flag |
|---|---|---|---|
| `complex` | It was too complicated | Era demasiado complicado | `burnedByTech` |
| `unused` | The team didn't use it | El equipo no lo usaba | `burnedByTech`, `toolUnused` |
| `price` | It cost too much | Costaba demasiado | `burnedByTech` |
| `results` | It didn't bring results | No dio resultados | `burnedByTech` |
| `still` | We still use them | Las seguimos usando | — |

**`k_decide`** (single, `kind: decision`)
- EN: "Who makes the final call on an investment like this?"
- ES: "¿Quién toma la decisión final sobre una inversión así?"

| id | EN | ES | team.decision |
|---|---|---|---|
| `me` | I do | Yo | 100 |
| `partner` | I do, together with a partner | Yo, junto con un socio | 80 |
| `group` | A group or board | Un grupo o una junta | 50 |
| `other` | Someone else decides | Lo decide otra persona | 40 · `notDecider` |

**`k_budget`** (single, `kind: budget`)
- EN: "If the plan made sense, what monthly range would be reasonable to fix this?" Sub: "Including tools and help. This only helps us suggest a realistic plan."
- ES: "Si el plan tuviera sentido, ¿qué rango mensual sería razonable para resolver esto?" Sub: "Incluye herramientas y ayuda. Solo nos sirve para proponerte un plan realista."

| id | EN | ES | team.budget |
|---|---|---|---|
| `lt500` | Under $500 | Menos de $500 | 25 |
| `500_1500` | $500 to $1,500 | De $500 a $1,500 | 55 |
| `1500_3000` | $1,500 to $3,000 | De $1,500 a $3,000 | 80 |
| `3000p` | More than $3,000 | Más de $3,000 | 95 |
| `plan` | I'd need to see a plan first | Primero necesitaría ver un plan | 50 |

**`k_when`** (single)
- EN: "When would you like to have this solved?"
- ES: "¿Para cuándo te gustaría tener esto resuelto?"

| id | EN | ES | Puntaje | team.timeline |
|---|---|---|---|---|
| `month` | This month | Este mes | readiness 95 | 100 |
| `quarter` | In the next 3 months | En los próximos 3 meses | readiness 75 | 75 |
| `year` | Later this year | Más adelante este año | readiness 40 | 40 |
| `exploring` | I'm just exploring for now | Por ahora solo estoy explorando | readiness 15 | 15 |

**Mini-hallazgos** (nunca mencionan presupuesto ni decisión)
1. `burnedByTech`
   - EN: "You've tried tools before and they didn't stick. That's common, and it usually means the tool arrived without someone to set it up and run it. Your plan takes that into account."
   - ES: "Ya probaste herramientas y no se quedaron. Es común, y casi siempre significa que llegó la herramienta sin alguien que la configurara y la manejara. Tu plan lo tiene en cuenta."
2. `k_when = exploring`
   - EN: "You're exploring for now. Your report separates the few things worth doing first from what can wait."
   - ES: "Por ahora estás explorando. Tu informe separa lo poco que vale la pena hacer primero de lo que puede esperar."
3. `"*"`
   - EN: "That's everything. Your full report is ready."
   - ES: "Eso es todo. Tu informe completo está listo."

---

## Textos del informe para los pilares que cambian

En el informe completo, cada pilar de la fase 1 cuyo valor cambió con la fase 2 muestra los dos valores.
- `report.pillarWas` — EN: "Phase 1: {was}" · ES: "Fase 1: {was}"
- `report.pillarWasAria` — EN: "{label}: {now} out of 100, {was} in Phase 1" · ES: "{label}: {now} de 100; {was} en la fase 1"

Los textos de las pantallas (pausa, entrada, informe, agenda) se redactan en la etapa 4 y 5, para aprobar aparte.

---

## Evidencia (verificada el 2026-11-10 en la fuente original)

| id | Texto propuesto (EN) | Fuente | URL | Estado |
|---|---|---|---|---|
| `reichheld` | ya está en la fase 1 | Fred Reichheld, Bain & Company (via HBR, 2014) | https://hbr.org/2014/10/the-value-of-keeping-the-right-customers | Verificada: el artículo atribuye el 5 % → 25 % a 95 % a Reichheld, de Bain |
| `schmitt2011` | "In a study of about 10,000 customers of a German bank, customers who joined through a referral program were worth at least 16% more than similar customers who didn't. The gap varied by customer segment." | Schmitt, Skiera & Van den Bulte, "Referral Programs and Customer Value", *Journal of Marketing*, 2011 (kind: academic) | https://faculty.wharton.upenn.edu/wp-content/uploads/2012/04/Schmitt-Skiera-vandenBulte-2011-Referral-Programs-Customer-Value.pdf | Verificada en el resumen (p. 46 de la revista, p. 1 del PDF) |
| `ftc2024` | "Since October 21, 2024, an FTC rule bans fake reviews and testimonials, paying for reviews that must say something positive or negative, certain undisclosed reviews from insiders, and threats to get negative reviews removed." | Federal Trade Commission, Rule on the Use of Consumer Reviews and Testimonials (16 CFR Part 465), 2024 (kind: government) | https://www.ftc.gov/business-guidance/resources/consumer-reviews-testimonials-rule-questions-answers | Verificada: fecha de vigencia y categorías en las preguntas y respuestas de la FTC y en su comunicado |

ES de `schmitt2011`: "En un estudio de unos 10.000 clientes de un banco alemán, los clientes que llegaron por un programa
de referidos valían al menos un 16 % más que clientes parecidos que no llegaron así. La diferencia cambiaba según el
segmento."
ES de `ftc2024`: "Desde el 21 de octubre de 2024, una regla de la FTC prohíbe las reseñas y testimonios falsos, pagar
por reseñas que deban ser positivas o negativas, ciertas reseñas de personas de la empresa sin aclararlo y las amenazas
para que se borren reseñas negativas."

Se omiten (sin fuente verificable o sin origen claro):
- "Conseguir un cliente nuevo cuesta de 5 a 25 veces más que retener uno": aparece en el mismo artículo de HBR, pero sin
  estudio citado ("depending on which study you believe").
- Tasas de cierre o costos por cliente "promedio del rubro", porcentaje de negocios que abandonan el software, y cualquier
  cifra sobre agencias.
- El "30 % más de clientes" del bloque 7 es un escenario, no una estadística.

---

## Readiness: casos de ejemplo frente a la fórmula preliminar

Preliminar (§3): `40 + ads>0 (20) + tracking crm|sheet (15) + team>1 (10)`, tope 85.
Propuesta (SPEC §4): `0.30·capacidad + 0.25·decisión + 0.25·presupuesto + 0.20·plazo`.

| Caso | Fase 1 | Fase 2 | Preliminar | Propuesta |
|---|---|---|---|---|
| A. Solo, sin anuncios, papel | team 1, ads 0, paper | yo (45) · justo (60) · decide yo (100) · < $500 (25) · 3 meses (75) | 40 | **62** |
| B. Equipo armado | 6 a 15, $1k–3k, CRM | persona (90) · sí (90) · con socio (80) · $1.5k–3k (80) · este mes (100) | 85 | **87** |
| C. Parece listo, no lo está | 2 a 5, < $1k, hoja de cálculo | contratar (35) · al tope (20) · otro decide (40) · ver plan (50) · explorando (15) | 85 | **34** |
| D. Burned by tech | 2 a 5, $3k–10k, bandeja | nadie (15) · justo (60) · yo (100) · $500–1.5k (55) · este mes (100) | 70 | **70** |
| E. Solo, organizado, sin anuncios | team 1, ads 0, CRM | yo (45) · sí (90) · yo (100) · > $3k (95) · este año (40) | 55 | **77** |

Lectura:
- C es el caso que la fase 2 debe corregir: con la fórmula preliminar salía 85, "Alta prioridad", y con lo que se sabe en
  la fase 2 baja a 34.
- D (burned by tech) queda igual: el flag no resta, como se aprobó.
- **A pasa el umbral de 55 (62) con presupuesto menor a $500.** Con Need y Potential altos, sería "Alta prioridad" para
  un negocio que no puede pagar casi nada. Opciones:
  1. Tope: con presupuesto `lt500`, Readiness máximo 50 (queda en "Nutrir"). *Recomendada.*
  2. Subir el peso del presupuesto a 0.35 (y capacidad 0.25, decisión 0.20, plazo 0.20): A da 57, sigue pasando.
  3. Subir el umbral a 65: A no pasa, pero D (70) pasa justo y cualquier ajuste pequeño lo cambia.
- El umbral de 55 queda **sin fijar** hasta que elijas una opción.
