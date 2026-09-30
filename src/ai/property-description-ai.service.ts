import { Inject, Injectable, Logger } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import OpenAI from 'openai';
import aiConfig from './ai.config';
import {
  PROPERTY_DESCRIPTION_SCHEMA,
  PROPERTY_DESCRIPTION_SYSTEM_PROMPT,
} from './prompts/property-description.prompt';
import {
  asMultilineText,
  isKnownNumber,
  numericVariants,
  stripEmojis,
  stripTrailingCallToAction,
  toNumbers,
  toSingleParagraph,
  toWords,
} from './utils/text-guards';
import { NumberLike, positiveNumber, propertyEnumLabel, stringList } from './utils/property-labels';

/**
 * Datos de la propiedad usados para las descripciones. A propósito NO incluye precio mínimo,
 * precio máximo, comisión, precio real de venta, propietario, asesor ni estado interno.
 */
export interface PropertyDescriptionSource {
  propertyType?: string | null;
  cityName?: string | null;
  referenceSector?: string | null;
  address?: string | null;
  zone?: string | null;
  topography?: string | null;
  landArea?: NumberLike;
  constructionArea?: NumberLike;
  constructionYears?: NumberLike;
  hasBasicServices?: boolean | null;
  basicServices?: unknown;
  cityTime?: NumberLike;
  features?: string | null;
  observations?: string | null;
  price?: NumberLike;
}

export interface PropertyDescriptions {
  shortDescription: string;
  longDescription: string;
}

const SPELLED_NUMBERS: Record<string, string> = {
  uno: '1',
  una: '1',
  un: '1',
  dos: '2',
  tres: '3',
  cuatro: '4',
  cinco: '5',
  seis: '6',
  siete: '7',
  ocho: '8',
  nueve: '9',
  diez: '10',
};

const NO_CREDIT_MESSAGE =
  'La cuenta de OpenAI no tiene crédito. Recárgala en https://platform.openai.com/settings/organization/billing/ e intenta nuevamente.';

const cleanText = (value?: string | null) => value?.trim() || undefined;

@Injectable()
export class PropertyDescriptionAiService {
  private readonly logger = new Logger(PropertyDescriptionAiService.name);
  private client: OpenAI | null = null;
  private pausedUntil = 0;
  private static readonly QUOTA_PAUSE_MS = 10 * 60_000;

  constructor(
    @Inject(aiConfig.KEY)
    private readonly config: ConfigType<typeof aiConfig>,
  ) {}

  isEnabled(): boolean {
    return (
      this.config.propertyDescription.enabled && Date.now() >= this.pausedUntil
    );
  }

  shouldAutoGenerateOnSave(): boolean {
    return (
      this.isEnabled() && this.config.propertyDescription.autoGenerateOnSave
    );
  }

  getUnavailableReason(): string | null {
    if (!this.config.apiKey) return 'Falta configurar OPENAI_API_KEY.';
    if (!this.config.propertyDescription.enabled) {
      return 'La generación de descripciones con IA está desactivada (AI_PROPERTY_DESCRIPTION_ENABLED).';
    }
    if (Date.now() < this.pausedUntil) return NO_CREDIT_MESSAGE;
    return null;
  }

  /** Datos que se envían a la IA, con etiquetas en español y sin campos vacíos. */
  buildPromptData(source: PropertyDescriptionSource): Record<string, unknown> {
    const label = propertyEnumLabel;
    const positive = positiveNumber;
    const services = stringList(source.basicServices);

    const data: Record<string, unknown> = {
      tipo: label(source.propertyType),
      ciudad: cleanText(source.cityName),
      sector: cleanText(source.referenceSector),
      direccion: cleanText(source.address),
      zona: label(source.zone),
      topografia: label(source.topography),
      areaTerreno_m2: positive(source.landArea),
      areaConstruccion_m2: positive(source.constructionArea),
      aniosDeConstruccion: positive(source.constructionYears),
      serviciosBasicos:
        source.hasBasicServices && services.length > 0 ? services : undefined,
      tiempoALaCiudad_minutos: positive(source.cityTime),
      caracteristicas: cleanText(source.features),
      observaciones: cleanText(source.observations),
      precioVenta_usd: positive(source.price),
    };

    return Object.fromEntries(
      Object.entries(data).filter(([, value]) => value !== undefined),
    );
  }

  async generate(
    source: PropertyDescriptionSource,
  ): Promise<{
    descriptions: PropertyDescriptions | null;
    error: string | null;
  }> {
    const unavailable = this.getUnavailableReason();
    if (unavailable) return { descriptions: null, error: unavailable };

    const promptData = this.buildPromptData(source);
    if (!promptData.tipo && !promptData.caracteristicas) {
      return {
        descriptions: null,
        error: 'Faltan datos de la propiedad para generar las descripciones.',
      };
    }

    // Un reintento si la primera respuesta no pasa las validaciones.
    for (let attempt = 1; attempt <= 2; attempt += 1) {
      try {
        const output = await this.requestCompletion(promptData);
        const descriptions = output ? this.validate(output, promptData) : null;
        if (descriptions) return { descriptions, error: null };
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Unknown error';
        this.logger.warn(
          `No se pudieron generar las descripciones con IA: ${message}`,
        );

        if (this.isNoCreditError(error)) {
          this.pausedUntil =
            Date.now() + PropertyDescriptionAiService.QUOTA_PAUSE_MS;
          this.logger.error(
            'OpenAI sin crédito: generación de descripciones pausada por 10 minutos',
          );
          return { descriptions: null, error: NO_CREDIT_MESSAGE };
        }
        return {
          descriptions: null,
          error: 'No se pudo conectar con la IA. Intenta nuevamente.',
        };
      }
    }

    return {
      descriptions: null,
      error:
        'La IA generó información que no está en los datos de la propiedad. Intenta nuevamente o completa el campo Características.',
    };
  }

  /**
   * Descarta la respuesta si trae cifras que no están en los datos de la propiedad
   * (así tampoco se filtran precio mínimo ni comisión, que no se envían).
   */
  validate(
    output: unknown,
    promptData: Record<string, unknown>,
  ): PropertyDescriptions | null {
    const { shortDescription, longDescription } = (output ?? {}) as Record<
      string,
      unknown
    >;
    // Corta: un solo párrafo sin íconos. Larga: párrafos sin íconos.
    const shortText =
      typeof shortDescription === 'string'
        ? stripTrailingCallToAction(
            toSingleParagraph(stripEmojis(shortDescription)),
          )
        : '';
    const short = shortText || null;
    const long = asMultilineText(
      typeof longDescription === 'string' ? stripEmojis(longDescription) : null,
    );
    if (!short || !long) {
      this.logger.warn('La IA devolvió descripciones vacías');
      return null;
    }

    const known = new Set<string>();
    for (const value of Object.values(promptData)) {
      if (typeof value === 'number')
        numericVariants(value).forEach((v) => known.add(v));
      else
        toNumbers(
          Array.isArray(value) ? value.join(' ') : String(value),
        ).forEach((v) => known.add(v));
    }
    const inputWords = toWords(
      Object.values(promptData)
        .filter((v) => typeof v === 'string')
        .join(' '),
    );
    for (const word of inputWords) {
      if (SPELLED_NUMBERS[word]) known.add(SPELLED_NUMBERS[word]);
    }

    const unknown = toNumbers(`${short}\n${long}`).filter(
      (n) => !isKnownNumber(n, known),
    );
    if (unknown.length > 0) {
      this.logger.warn(
        `Descripciones de IA descartadas por cifras no presentes en los datos: ${unknown.join(', ')}`,
      );
      return null;
    }

    return { shortDescription: short, longDescription: long };
  }

  private getClient(): OpenAI {
    if (!this.client) {
      this.client = new OpenAI({
        apiKey: this.config.apiKey ?? undefined,
        timeout: Math.max(this.config.timeoutMs, 45_000),
        maxRetries: this.config.maxRetries,
      });
    }
    return this.client;
  }

  private async requestCompletion(
    promptData: Record<string, unknown>,
  ): Promise<unknown> {
    const completion = await this.getClient().chat.completions.create({
      model: this.config.model,
      temperature: this.config.propertyDescription.temperature,
      max_completion_tokens: this.config.propertyDescription.maxOutputTokens,
      response_format: {
        type: 'json_schema',
        json_schema:
          PROPERTY_DESCRIPTION_SCHEMA as unknown as OpenAI.ResponseFormatJSONSchema['json_schema'],
      },
      messages: [
        { role: 'system', content: PROPERTY_DESCRIPTION_SYSTEM_PROMPT },
        { role: 'user', content: JSON.stringify(promptData) },
      ],
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) return null;
    try {
      return JSON.parse(content);
    } catch {
      this.logger.warn('La IA devolvió un JSON inválido');
      return null;
    }
  }

  private isNoCreditError(error: unknown): boolean {
    const { code, type } = (error ?? {}) as {
      code?: string | null;
      type?: string | null;
    };
    return (
      type === 'insufficient_quota' ||
      code === 'insufficient_quota' ||
      code === 'credit_balance_exhausted'
    );
  }
}
