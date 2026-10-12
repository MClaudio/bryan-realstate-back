import { registerAs } from '@nestjs/config';

/**
 * Configuración del modelo GPT usado por el backend.
 * Todos los valores se pueden sobreescribir desde variables de entorno.
 */
export interface AiConfig {
  apiKey: string | null;
  model: string;
  temperature: number;
  maxOutputTokens: number;
  timeoutMs: number;
  maxRetries: number;
  contactParser: {
    enabled: boolean;
    concurrency: number;
    defaultCountry: string;
  };
  propertyDescription: {
    enabled: boolean;
    /** Algo más alta que la del parser: redacción más natural, sin salir de los datos. */
    temperature: number;
    maxOutputTokens: number;
    /** Generar automáticamente al guardar si ambas descripciones están vacías. */
    autoGenerateOnSave: boolean;
  };
  recommendation: {
    enabled: boolean;
    model: string;
    temperature: number;
    maxOutputTokens: number;
    /** Clientes por llamada; si hay más, se hacen varias llamadas. */
    batchSize: number;
    /** Candidatos con puntaje menor se descartan. */
    minScore: number;
    timeoutMs: number;
  };
}

const toNumber = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value);
  return value !== undefined && value !== '' && Number.isFinite(parsed) ? parsed : fallback;
};

const toBoolean = (value: string | undefined, fallback: boolean): boolean => {
  if (value === undefined || value === '') return fallback;
  return ['true', '1', 'yes', 'on'].includes(value.trim().toLowerCase());
};

export default registerAs('ai', (): AiConfig => {
  const apiKey = process.env.OPENAI_API_KEY?.trim() || null;

  return {
    apiKey,
    model: process.env.OPENAI_MODEL?.trim() || 'gpt-4.1-mini',
    temperature: toNumber(process.env.OPENAI_TEMPERATURE, 0),
    maxOutputTokens: toNumber(process.env.OPENAI_MAX_OUTPUT_TOKENS, 600),
    timeoutMs: toNumber(process.env.OPENAI_TIMEOUT_MS, 20_000),
    maxRetries: toNumber(process.env.OPENAI_MAX_RETRIES, 2),
    contactParser: {
      // Sin API key la IA queda desactivada y se usa el flujo tradicional.
      enabled: Boolean(apiKey) && toBoolean(process.env.AI_CONTACT_PARSER_ENABLED, true),
      concurrency: Math.max(1, toNumber(process.env.AI_CONTACT_PARSER_CONCURRENCY, 4)),
      defaultCountry: (process.env.AI_DEFAULT_PHONE_COUNTRY?.trim() || 'EC').toUpperCase(),
    },
    propertyDescription: {
      enabled: Boolean(apiKey) && toBoolean(process.env.AI_PROPERTY_DESCRIPTION_ENABLED, true),
      temperature: toNumber(process.env.OPENAI_DESCRIPTION_TEMPERATURE, 0.4),
      maxOutputTokens: toNumber(process.env.OPENAI_DESCRIPTION_MAX_OUTPUT_TOKENS, 1500),
      autoGenerateOnSave: toBoolean(process.env.AI_PROPERTY_DESCRIPTION_AUTO_ON_SAVE, true),
    },
    recommendation: {
      enabled: Boolean(apiKey) && toBoolean(process.env.AI_RECOMMENDATION_ENABLED, true),
      model:
        process.env.OPENAI_RECOMMENDATION_MODEL?.trim() || process.env.OPENAI_MODEL?.trim() || 'gpt-4.1-mini',
      temperature: toNumber(process.env.OPENAI_RECOMMENDATION_TEMPERATURE, 0),
      maxOutputTokens: toNumber(process.env.OPENAI_RECOMMENDATION_MAX_OUTPUT_TOKENS, 2000),
      batchSize: Math.max(1, toNumber(process.env.AI_RECOMMENDATION_BATCH_SIZE, 120)),
      minScore: toNumber(process.env.AI_RECOMMENDATION_MIN_SCORE, 40),
      timeoutMs: toNumber(process.env.OPENAI_RECOMMENDATION_TIMEOUT_MS, 60_000),
    },
  };
});
