import { Inject, Injectable, Logger } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import OpenAI from 'openai';
import aiConfig from './ai.config';
import { buildContactParserSystemPrompt, CONTACT_PARSER_SCHEMA } from './prompts/contact-parser.prompt';
import { formatPhoneNumber } from '../utils/phoneFormatter';
import { normalizeEmail, normalizeNamePair } from '../sync-contacts/utils/contact-normalization';
import { asMultilineText, asText, toNumbers, toWords } from './utils/text-guards';

/** Datos crudos del contacto tal como llegan de Google Contacts o del formulario. */
export interface RawContactInput {
  givenName?: string | null;
  familyName?: string | null;
  displayName?: string | null;
  phones?: string[];
  emails?: string[];
  birthday?: string | null;
  address?: string | null;
  organization?: string | null;
  biography?: string | null;
  notes?: string | null;
  interestDescription?: string | null;
}

export interface ParsedContact {
  firstName: string;
  lastName: string;
  /** E.164 validado con libphonenumber, o null si no hay teléfono válido. */
  phone: string | null;
  email: string | null;
  /** YYYY-MM-DD */
  birthDate: string | null;
  address: string | null;
  notes: string | null;
  interestDescription: string | null;
}

interface RawAiOutput {
  firstName?: unknown;
  lastName?: unknown;
  phone?: unknown;
  phoneCountry?: unknown;
  email?: unknown;
  birthDate?: unknown;
  address?: unknown;
  notes?: unknown;
  interestDescription?: unknown;
}

/** Palabras (sin acentos, minúsculas) que marcan el inicio del texto de interés en un nombre. */
const INTEREST_START_WORDS = new Set([
  'busca', 'buscan', 'buscando', 'quiere', 'quieren', 'desea', 'necesita', 'interesado', 'interesada',
  'interzado', 'interzada', 'interesa', 'interes', 'compra', 'comprar', 'vende', 'venta', 'vender',
  'arriendo', 'arrienda', 'arrendar', 'alquiler', 'alquilar', 'casa', 'casas', 'terreno', 'terrenos',
  'lote', 'departamento', 'dpto', 'depa', 'local', 'oficina', 'propiedad', 'propiedades', 'quinta',
  'hacienda', 'suite', 'en', 'para', 'por', 'con', 'que', 'ref', 'referido', 'cliente',
]);

@Injectable()
export class ContactAiParserService {
  private readonly logger = new Logger(ContactAiParserService.name);
  private client: OpenAI | null = null;

  constructor(
    @Inject(aiConfig.KEY)
    private readonly config: ConfigType<typeof aiConfig>,
  ) {}

  /** Si la cuenta de OpenAI se queda sin crédito, se pausa la IA un tiempo para no retrasar cada contacto. */
  private pausedUntil = 0;
  private static readonly QUOTA_PAUSE_MS = 10 * 60_000;

  private static readonly NO_CREDIT_MESSAGE =
    'La cuenta de OpenAI no tiene crédito. Recárgala en https://platform.openai.com/settings/organization/billing/ e intenta nuevamente.';

  isEnabled(): boolean {
    return this.config.contactParser.enabled && Date.now() >= this.pausedUntil;
  }

  /** Motivo por el que la IA no está disponible, o null si lo está. */
  getUnavailableReason(): string | null {
    if (!this.config.apiKey) return 'Falta configurar OPENAI_API_KEY.';
    if (!this.config.contactParser.enabled) return 'La normalización con IA está desactivada (AI_CONTACT_PARSER_ENABLED).';
    if (Date.now() < this.pausedUntil) return ContactAiParserService.NO_CREDIT_MESSAGE;
    return null;
  }

  /**
   * Normaliza un contacto con GPT. Devuelve null si la IA está deshabilitada o falla,
   * para que el llamador use el flujo tradicional.
   */
  async parseContact(input: RawContactInput): Promise<ParsedContact | null> {
    return (await this.parseContactDetailed(input)).contact;
  }

  /** Igual que parseContact, pero indica el motivo cuando falla (para mostrarlo al usuario). */
  async parseContactDetailed(
    input: RawContactInput,
  ): Promise<{ contact: ParsedContact | null; error: string | null }> {
    const unavailable = this.getUnavailableReason();
    if (unavailable) return { contact: null, error: unavailable };

    try {
      const output = await this.requestCompletion(input);
      if (!output) return { contact: null, error: 'La IA devolvió una respuesta inválida. Intenta nuevamente.' };
      return { contact: this.sanitize(output, input), error: null };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(`No se pudo normalizar el contacto con IA: ${message}`);

      if (this.isNoCreditError(error)) {
        this.pausedUntil = Date.now() + ContactAiParserService.QUOTA_PAUSE_MS;
        this.logger.error('OpenAI sin crédito: normalización con IA pausada por 10 minutos');
        return { contact: null, error: ContactAiParserService.NO_CREDIT_MESSAGE };
      }
      return { contact: null, error: 'No se pudo conectar con la IA. Intenta nuevamente.' };
    }
  }

  private isNoCreditError(error: unknown): boolean {
    const { code, type } = (error ?? {}) as { code?: string | null; type?: string | null };
    return (
      type === 'insufficient_quota' ||
      code === 'insufficient_quota' ||
      code === 'credit_balance_exhausted'
    );
  }

  /** Normaliza varios contactos respetando el límite de concurrencia configurado. */
  async parseMany(inputs: RawContactInput[]): Promise<Array<ParsedContact | null>> {
    const results: Array<ParsedContact | null> = new Array(inputs.length).fill(null);
    if (!this.isEnabled() || inputs.length === 0) return results;

    let cursor = 0;
    const worker = async () => {
      while (cursor < inputs.length) {
        const index = cursor++;
        results[index] = await this.parseContact(inputs[index]);
      }
    };

    const workers = Math.min(this.config.contactParser.concurrency, inputs.length);
    await Promise.all(Array.from({ length: workers }, worker));
    return results;
  }

  private getClient(): OpenAI {
    if (!this.client) {
      this.client = new OpenAI({
        apiKey: this.config.apiKey ?? undefined,
        timeout: this.config.timeoutMs,
        maxRetries: this.config.maxRetries,
      });
    }
    return this.client;
  }

  private async requestCompletion(input: RawContactInput): Promise<RawAiOutput | null> {
    const completion = await this.getClient().chat.completions.create({
      model: this.config.model,
      temperature: this.config.temperature,
      max_completion_tokens: this.config.maxOutputTokens,
      response_format: {
        type: 'json_schema',
        json_schema: CONTACT_PARSER_SCHEMA as unknown as OpenAI.ResponseFormatJSONSchema['json_schema'],
      },
      messages: [
        {
          role: 'system',
          content: buildContactParserSystemPrompt(this.config.contactParser.defaultCountry),
        },
        { role: 'user', content: JSON.stringify(this.compactInput(input)) },
      ],
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      this.logger.warn('La IA devolvió una respuesta vacía');
      return null;
    }

    try {
      return JSON.parse(content) as RawAiOutput;
    } catch {
      this.logger.warn('La IA devolvió un JSON inválido');
      return null;
    }
  }

  /** Quita campos vacíos para reducir tokens y ruido. */
  private compactInput(input: RawContactInput): Record<string, unknown> {
    return Object.fromEntries(
      Object.entries(input).filter(([, value]) =>
        Array.isArray(value) ? value.length > 0 : value !== null && value !== undefined && value !== '',
      ),
    );
  }

  /**
   * Validaciones en código sobre la respuesta de la IA.
   * Todo lo que no se pueda respaldar con la entrada se descarta (anti-alucinación).
   */
  sanitize(output: RawAiOutput, input: RawContactInput): ParsedContact {
    const sourceText = [
      input.givenName,
      input.familyName,
      input.displayName,
      input.organization,
      input.biography,
      input.notes,
      input.interestDescription,
      input.address,
      input.birthday,
      ...(input.emails ?? []),
    ]
      .filter(Boolean)
      .join(' ');
    const sourceWords = new Set(toWords(sourceText));
    const sourceNumbers = new Set(toNumbers(sourceText));

    const allWordsInSource = (value: string) => toWords(value).every((word) => sourceWords.has(word));
    const allNumbersInSource = (value: string) => toNumbers(value).every((n) => sourceNumbers.has(n));

    // Nombres: cada palabra debe existir en la entrada.
    let firstName = asText(output.firstName) ?? '';
    let lastName = asText(output.lastName) ?? '';
    if (!firstName || !allWordsInSource(`${firstName} ${lastName}`)) {
      if (firstName) {
        this.logger.warn(`Nombre de IA descartado por no estar en la entrada: "${firstName} ${lastName}"`);
      }
      const fallback = normalizeNamePair(input.givenName, input.familyName, input.displayName);
      firstName = fallback.firstName;
      lastName = fallback.lastName;
    } else {
      // Recuperar palabras del nombre que la IA descartó (ej. abreviaturas como "Mldo").
      const recovered = this.recoverDroppedNameWords(input, firstName, lastName, [
        asText(output.interestDescription),
        asText(output.notes),
      ]);
      firstName = recovered.firstName;
      lastName = recovered.lastName;
    }

    // Intereses y notas: pueden redactarse de nuevo, pero no pueden introducir cifras nuevas.
    let interestDescription = asMultilineText(output.interestDescription);
    if (interestDescription && !allNumbersInSource(interestDescription)) {
      this.logger.warn('Intereses de IA descartados por contener cifras que no están en la entrada');
      interestDescription = asMultilineText(input.interestDescription);
    }

    let notes = asMultilineText(output.notes);
    if (notes && !allNumbersInSource(notes)) {
      this.logger.warn('Nota de IA descartada por contener cifras que no están en la entrada');
      notes = asMultilineText(input.notes);
    }

    // Email: solo si coincide con un email de la entrada.
    const inputEmails = (input.emails ?? []).map((e) => normalizeEmail(e)).filter(Boolean) as string[];
    const aiEmail = normalizeEmail(asText(output.email));
    const email = aiEmail && inputEmails.includes(aiEmail) ? aiEmail : (inputEmails[0] ?? null);

    // Dirección: todas sus palabras deben estar en la entrada.
    const aiAddress = asText(output.address);
    const address = aiAddress && allWordsInSource(aiAddress) ? aiAddress : asText(input.address);

    return {
      firstName,
      lastName,
      phone: this.resolvePhone(output, input),
      email,
      birthDate: this.resolveBirthDate(asText(output.birthDate), sourceNumbers),
      address,
      notes,
      interestDescription,
    };
  }

  /**
   * Recorre las palabras de givenName y familyName hasta que empieza el texto de interés.
   * Las palabras de ese tramo que la IA no puso ni en el nombre ni en intereses/notas
   * se devuelven al nombre (givenName) o al apellido (familyName).
   */
  private recoverDroppedNameWords(
    input: RawContactInput,
    firstName: string,
    lastName: string,
    otherOutputs: Array<string | null>,
  ): { firstName: string; lastName: string } {
    const nameWords = new Set(toWords(`${firstName} ${lastName}`));
    const otherWords = new Set(toWords(otherOutputs.filter(Boolean).join(' ')));
    const recoveredFirst: string[] = [];
    const recoveredLast: string[] = [];
    let stopped = false;

    const walk = (value: string | null | undefined, target: string[]) => {
      for (const token of (value ?? '').split(/\s+/)) {
        if (stopped) return;
        const words = toWords(token);
        if (words.length === 0) continue;
        const [word] = words;
        if (INTEREST_START_WORDS.has(word) || /\d/.test(word) || otherWords.has(word)) {
          stopped = true;
          return;
        }
        if (words.every((w) => nameWords.has(w))) continue;
        target.push(token.replace(/[,;:]+$/, ''));
      }
    };

    walk(input.givenName, recoveredFirst);
    walk(input.familyName, recoveredLast);

    if (recoveredFirst.length || recoveredLast.length) {
      this.logger.warn(
        `Palabras del nombre recuperadas tras la IA: "${[...recoveredFirst, ...recoveredLast].join(' ')}"`,
      );
    }

    const join = (base: string, extra: string[]) =>
      [base === 'N/A' ? '' : base, ...extra].filter(Boolean).join(' ');

    return {
      firstName: join(firstName, recoveredFirst),
      lastName: join(lastName, recoveredLast),
    };
  }

  private resolvePhone(output: RawAiOutput, input: RawContactInput): string | null {
    const rawPhones = (input.phones ?? []).filter(Boolean);
    const rawDigits = rawPhones.map((p) => p.replace(/\D/g, ''));

    // El número debe provenir de la entrada: sus últimos 8 dígitos deben estar en algún teléfono crudo.
    const matchesInput = (e164: string) => {
      const tail = e164.replace(/\D/g, '').slice(-8);
      return rawDigits.some((digits) => digits.includes(tail));
    };

    const candidates = [asText(output.phone), ...rawPhones].filter(Boolean) as string[];
    for (const candidate of candidates) {
      const { formatted, isValid } = formatPhoneNumber(candidate);
      if (isValid && matchesInput(formatted)) return formatted;
    }

    return null;
  }

  private resolveBirthDate(value: string | null, sourceNumbers: Set<string>): string | null {
    if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;

    const date = new Date(`${value}T00:00:00Z`);
    if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) return null;
    if (date.getTime() > Date.now() || date.getUTCFullYear() < 1900) return null;

    // El año debe aparecer en la entrada.
    const year = value.slice(0, 4);
    const yearInSource = [...sourceNumbers].some((n) => n.includes(year));
    return yearInSource ? value : null;
  }
}
