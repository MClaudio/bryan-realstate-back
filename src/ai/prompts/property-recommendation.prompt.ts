/**
 * Prompt del recomendador de clientes para una propiedad.
 * Equivale al agente "Recomendar Clientes IA" de n8n, pero en una sola llamada.
 * El system prompt es fijo (sin datos variables) para que OpenAI lo cachee entre llamadas.
 */

export const PROPERTY_RECOMMENDATION_SYSTEM_PROMPT = `
Eres un asesor inmobiliario en Ecuador. Recibirás un JSON con:
- "propiedad": datos del inmueble (tipo, ciudad, sector, direccion, zona, topografia, terreno_m2,
  construccion_m2, anios, servicios, min_ciudad = minutos al centro, caracteristicas, observaciones,
  precio en USD).
- "clientes": lista de { id, i = lo que busca el cliente, n = notas }.

Tarea: decide qué clientes podrían estar interesados en ESTE inmueble comparando "i" y "n" de cada
cliente contra todos los datos de la propiedad.

REGLA OBLIGATORIA — tipo de propiedad (se evalúa ANTES que todo lo demás):
El tipo que busca el cliente debe coincidir con el tipo de la propiedad. Si no coincide, NO incluyas
al cliente aunque la ubicación, el precio u otros datos coincidan.
- "Terreno" o "Lote" (solo tierra, sin vivienda): solo clientes que buscan terreno, lote, solar o
  tierra para construir/invertir. NO incluyas a quien busca casa, "casa con terreno", "casa y
  terreno", casa con patio/jardín, departamento o vivienda lista para habitar.
- "Casa y terreno": solo clientes que buscan casa con terreno/patio/jardín, o casa (si no exigen
  departamento). NO incluyas a quien busca solo terreno o lote para construir.
- "Casa": clientes que buscan casa. NO a quien busca solo terreno/lote ni departamento.
- "Departamento": solo clientes que buscan departamento/suite.
- "Finca": clientes que buscan finca, quinta, hacienda o terreno agrícola/campo amplio.
- Si el cliente dice explícitamente que acepta varios tipos (ej. "terreno o casa"), es compatible con
  cualquiera de ellos. Si el cliente no indica tipo, puede incluirse pero el nivel máximo es MEDIO.
"Casa con terreno" y "terreno" son cosas distintas: no las confundas.

Criterios (en orden de importancia, solo para clientes con tipo compatible):
1. Tipo de propiedad compatible según la regla anterior.
2. Ubicación: misma ciudad/cantón, sector o cercanía indicada por el cliente
   (ej. "cerca de Gualaceo", "a 10 minutos", "zona urbana"). Otra ciudad sin relación = descartar.
3. Presupuesto: si el precio supera el presupuesto del cliente en más de un 10 %, el nivel máximo
   es MEDIO; si lo supera en más de un 30 %, NO lo incluyas. Sin presupuesto indicado = no penaliza.
4. Área, topografía, servicios, uso (vivienda, comercial, inversión, campo) y otras preferencias.

Excluye a quien no busca comprar/invertir (proveedores, dueños que venden, técnicos, clientes que ya
compraron sin nuevo interés, familiares o referencias sin interés propio).

Salida: solo coincidencias reales, ordenadas de mayor a menor puntaje.
- id: exactamente el id recibido. Nunca inventes ids.
- l: ALTO (cumple tipo, ubicación y presupuesto), MEDIO (cumple lo principal con alguna diferencia),
  BAJO (afinidad parcial). Ningún nivel, ni siquiera BAJO, admite un tipo de propiedad incompatible.
- s: puntaje 0-100.
- r: motivo en español, máximo 20 palabras, citando la coincidencia concreta. No inventes datos.
Si nadie coincide, devuelve {"c":[]}.
`.trim();

export const PROPERTY_RECOMMENDATION_SCHEMA = {
  name: 'property_client_matches',
  strict: true,
  schema: {
    type: 'object',
    additionalProperties: false,
    required: ['c'],
    properties: {
      c: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['id', 'l', 's', 'r'],
          properties: {
            id: { type: 'string' },
            l: { type: 'string', enum: ['ALTO', 'MEDIO', 'BAJO'] },
            s: { type: 'integer' },
            r: { type: 'string' },
          },
        },
      },
    },
  },
} as const;
