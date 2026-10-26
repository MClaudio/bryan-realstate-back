/**
 * Prompt del extractor de criterios de clientes. Solo se usa cuando las reglas
 * (recommendations/criteria-parser.ts) no pueden leer el interés con seguridad.
 * El system prompt es fijo para que OpenAI lo cachee entre llamadas.
 */

export const CLIENT_CRITERIA_SYSTEM_PROMPT = `
Eres un asistente de una inmobiliaria en Ecuador. Convierte en datos estructurados lo que BUSCA cada
cliente según su texto (interés + notas). NO comparas con propiedades: solo interpretas el texto.

Recibirás un JSON con:
- "ciudades": nombres exactos de los cantones válidos.
- "sectores": sectores conocidos de las propiedades (referencia, no exhaustiva).
- "clientes": lista de { id, texto, reglas, dudas }. "reglas" es lo que ya se leyó automáticamente y
  "dudas" lo que no se pudo resolver: corrige y completa a partir del texto.

REGLA PRINCIPAL: no inventes ni amplíes. Si el texto no lo dice, deja la lista vacía o null.
- Ubicación: usa solo ciudades de "ciudades", escritas exactamente igual. Un cantón NO incluye a otro
  cercano: "Gualaceo" no incluye Paute ni Chordeleg. Solo agrega otra ciudad si el cliente la acepta
  explícitamente ("también acepto Paute"). "Cerca de Gualaceo", "alrededores de Gualaceo", "a las
  afueras de Gualaceo", "fuera de Gualaceo" (en sus afueras) → accepted_cities = ["Gualaceo"].
  "No en Paute", "excepto Cuenca" → excluded_cities. Parroquias, comunidades o sectores que no son
  ciudades (Pagrán, Callazay, San Juan, El Progreso…) → accepted_sectors, y su cantón en
  accepted_cities solo si el texto lo dice o es inequívoco.
- "a 5 minutos del centro" → max_minutes_center = 5. "Cerca del centro", "céntrico" → near_center = true.
- Tipo (accepted_types): Terreno, Lote, Casa, Casa_y_terreno, Departamento, Finca.
  "terreno/lote/solar" → [Terreno, Lote, Finca]. "casa" → [Casa, Casa_y_terreno].
  "casa con terreno/patio/jardín" → [Casa_y_terreno, Casa]. "terreno para construir casa/villa/quinta"
  es terreno (la casa es el uso). "departamento/suite" → [Departamento]. "finca/quinta/hacienda" →
  [Finca]. "una propiedad / inmueble" sin tipo → generic_type = true y accepted_types vacío.
- intent: COMPRA si busca comprar o invertir; VENDE si vende u ofrece una propiedad; OTRO si ya compró,
  no busca, es proveedor o referencia sin interés propio. Si vende algo Y busca comprar otra cosa →
  COMPRA (con lo que busca comprar).
- Cifras: escribe en USD o m² SOLO cifras que estén en el texto, interpretando las variantes:
  "100 mil", "100k", "$100mil", "$100000", "100.000", "cien mil" → 100000. "hasta / máximo / tope /
  presupuesto de" → max_budget_usd. "entre 50 y 70 mil" → min 50000, max 70000. Un número sin unidad
  que no se pueda interpretar con seguridad → null.
  Área: "900 m2 en adelante / más de / mayor a / desde / de" → min_land_m2. "hasta 1000 m2" →
  max_land_m2. "2 hectáreas" → 20000. Área de construcción → min_construction_m2. Distancias
  ("a 200 metros de la vía") no son área.
- topographies: "plano" → [Plano]; "plano o semiplano" / "semiplano" → [Plano, Semiplano].
- zones: "zona urbana / urbano" → [Urbano, Urbanizacion]; "rural" → [Rural]. "cerca de zona urbana" no
  es requisito de zona.
- required_services: agua, luz, alcantarillado, riego, internet, telefono ("servicios básicos" → agua, luz).
- uses: vivienda, agricola, inversion, comercial, recreacion (quinta, cabaña, glamping, vacacional).
- wanted_features: dormitorios, banos, jardin, parqueadero, frutales, vista, piscina, departamentos,
  local comercial, acceso vial.
- notes: una frase corta con lo que interpretaste de las dudas (máximo 20 palabras).
Devuelve un elemento por cada cliente recibido, con su id exacto.
`.trim();

const STRING_LIST = { type: 'array', items: { type: 'string' } } as const;
const enumList = (values: string[]) =>
  ({ type: 'array', items: { type: 'string', enum: values } }) as const;
const NULLABLE_NUMBER = { type: ['number', 'null'] } as const;

export const CLIENT_CRITERIA_SCHEMA = {
  name: 'client_criteria',
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
          required: [
            'id',
            'intent',
            'accepted_types',
            'generic_type',
            'accepted_cities',
            'excluded_cities',
            'accepted_sectors',
            'max_minutes_center',
            'near_center',
            'min_land_m2',
            'max_land_m2',
            'min_construction_m2',
            'min_budget_usd',
            'max_budget_usd',
            'topographies',
            'zones',
            'required_services',
            'uses',
            'wanted_features',
            'notes',
          ],
          properties: {
            id: { type: 'string' },
            intent: { type: 'string', enum: ['COMPRA', 'VENDE', 'OTRO'] },
            accepted_types: enumList([
              'Terreno',
              'Lote',
              'Casa',
              'Casa_y_terreno',
              'Departamento',
              'Finca',
            ]),
            generic_type: { type: 'boolean' },
            accepted_cities: STRING_LIST,
            excluded_cities: STRING_LIST,
            accepted_sectors: STRING_LIST,
            max_minutes_center: { type: ['integer', 'null'] },
            near_center: { type: 'boolean' },
            min_land_m2: NULLABLE_NUMBER,
            max_land_m2: NULLABLE_NUMBER,
            min_construction_m2: NULLABLE_NUMBER,
            min_budget_usd: NULLABLE_NUMBER,
            max_budget_usd: NULLABLE_NUMBER,
            topographies: enumList([
              'Plano',
              'Semiplano',
              'Pendiente',
              'Mixto',
            ]),
            zones: enumList(['Urbano', 'Rural', 'Urbanizacion']),
            required_services: enumList([
              'agua',
              'luz',
              'alcantarillado',
              'riego',
              'internet',
              'telefono',
            ]),
            uses: enumList([
              'vivienda',
              'agricola',
              'inversion',
              'comercial',
              'recreacion',
            ]),
            wanted_features: enumList([
              'dormitorios',
              'banos',
              'jardin',
              'parqueadero',
              'frutales',
              'vista',
              'piscina',
              'departamentos',
              'local comercial',
              'acceso vial',
            ]),
            notes: { type: 'string' },
          },
        },
      },
    },
  },
} as const;
