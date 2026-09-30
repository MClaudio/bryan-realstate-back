import { ContactAiParserService, RawContactInput } from './contact-ai-parser.service';
import type { AiConfig } from './ai.config';

const buildConfig = (enabled = true): AiConfig => ({
  apiKey: 'test-key',
  model: 'test-model',
  temperature: 0,
  maxOutputTokens: 600,
  timeoutMs: 1000,
  maxRetries: 0,
  contactParser: { enabled, concurrency: 2, defaultCountry: 'EC' },
  propertyDescription: { enabled, temperature: 0.4, maxOutputTokens: 1500, autoGenerateOnSave: true },
  recommendation: { enabled, model: "test-model", temperature: 0, maxOutputTokens: 2000, batchSize: 120, minScore: 60, timeoutMs: 1000 },
});

const mockCompletion = (service: ContactAiParserService, content: string | null) => {
  const create = jest.fn().mockResolvedValue({ choices: [{ message: { content } }] });
  (service as unknown as { client: unknown }).client = { chat: { completions: { create } } };
  return create;
};

const aiOutput = (overrides: Record<string, unknown> = {}) =>
  JSON.stringify({
    firstName: 'Jose',
    lastName: 'Martines',
    phone: '+593991234567',
    phoneCountry: 'EC',
    email: null,
    birthDate: null,
    address: null,
    notes: null,
    interestDescription: 'Busca una casa en Gualaceo.',
    ...overrides,
  });

const joseInput: RawContactInput = {
  givenName: 'Jose Martines',
  familyName: 'Interzado en casa gualaceo',
  phones: ['0991234567'],
};

describe('ContactAiParserService', () => {
  it('separa nombre, apellido e intereses', async () => {
    const service = new ContactAiParserService(buildConfig());
    mockCompletion(service, aiOutput());

    const result = await service.parseContact(joseInput);

    expect(result).toEqual({
      firstName: 'Jose',
      lastName: 'Martines',
      phone: '+593991234567',
      email: null,
      birthDate: null,
      address: null,
      notes: null,
      interestDescription: 'Busca una casa en Gualaceo.',
    });
  });

  it('devuelve null sin llamar a la API si está deshabilitado', async () => {
    const service = new ContactAiParserService(buildConfig(false));
    const create = mockCompletion(service, aiOutput());

    expect(await service.parseContact(joseInput)).toBeNull();
    expect(create).not.toHaveBeenCalled();
  });

  it('devuelve null ante JSON inválido', async () => {
    const service = new ContactAiParserService(buildConfig());
    mockCompletion(service, '{no-json');

    expect(await service.parseContact(joseInput)).toBeNull();
  });

  it('rechaza nombres que no están en la entrada', async () => {
    const service = new ContactAiParserService(buildConfig());
    mockCompletion(service, aiOutput({ firstName: 'José Luis', lastName: 'Martínez Pérez' }));

    const result = await service.parseContact({ givenName: 'Jose', familyName: 'Martines', phones: ['0991234567'] });

    expect(result?.firstName).toBe('Jose');
    expect(result?.lastName).toBe('Martines');
  });

  it('recupera abreviaturas del apellido que la IA descartó', async () => {
    const service = new ContactAiParserService(buildConfig());
    mockCompletion(
      service,
      aiOutput({
        firstName: 'Claudio',
        lastName: '',
        interestDescription:
          'Interés en una casa amplia ubicada en Cuenca, con patio y mínimo 3 cuartos.\n- Tipo de propiedad: Casa\n- Ubicación: Cuenca',
      }),
    );

    const result = await service.parseContact({
      givenName: 'Claudio',
      familyName: 'Mldo Busca casa amplia en Cuenca, con patio y minimo 3 cuartos',
      phones: ['0991234567'],
    });

    expect(result?.firstName).toBe('Claudio');
    expect(result?.lastName).toBe('Mldo');
  });

  it('no mete palabras del interés en el apellido', async () => {
    const service = new ContactAiParserService(buildConfig());
    mockCompletion(service, aiOutput({ firstName: 'Don', lastName: 'Manuel', interestDescription: 'Interés en una propiedad en Cuenca.' }));

    const result = await service.parseContact({
      givenName: 'Don',
      familyName: 'Manuel Busca una propiedad en Cuenca',
      phones: ['0991234567'],
    });

    expect(result?.lastName).toBe('Manuel');
  });

  it('acepta nombres con acentos o mayúsculas distintas', async () => {
    const service = new ContactAiParserService(buildConfig());
    mockCompletion(service, aiOutput({ firstName: 'José', lastName: 'Martines' }));

    const result = await service.parseContact({ givenName: 'JOSE', familyName: 'martines', phones: ['0991234567'] });

    expect(result?.firstName).toBe('José');
  });

  it('descarta intereses con cifras inventadas', async () => {
    const service = new ContactAiParserService(buildConfig());
    mockCompletion(service, aiOutput({ interestDescription: 'Busca casa de 3 habitaciones por $80.000 en Gualaceo.' }));

    const result = await service.parseContact(joseInput);

    expect(result?.interestDescription).toBeNull();
  });

  it('acepta intereses descriptivos con cifras expresadas como "mil"', async () => {
    const service = new ContactAiParserService(buildConfig());
    const interest =
      'Interés en un terreno en Yunguilla para construir, con un presupuesto máximo de 30.000.\n- Tipo de propiedad: Terreno\n- Ubicación: Yunguilla\n- Presupuesto: Hasta 30.000';
    mockCompletion(service, aiOutput({ firstName: 'Maria', lastName: 'Lopez', interestDescription: interest }));

    const result = await service.parseContact({
      givenName: 'maria',
      familyName: 'lopez terreno',
      phones: ['0991234567'],
      biography: 'quiere terr en yunguilla p construir, max 30mil',
    });

    expect(result?.interestDescription).toBe(interest);
  });

  it('usa el teléfono crudo si el de la IA es inválido o no coincide con la entrada', async () => {
    const service = new ContactAiParserService(buildConfig());
    mockCompletion(service, aiOutput({ phone: '+593987000000' }));

    const result = await service.parseContact(joseInput);

    expect(result?.phone).toBe('+593991234567');
  });

  it('descarta fechas inválidas o cuyo año no está en la entrada', async () => {
    const service = new ContactAiParserService(buildConfig());
    mockCompletion(service, aiOutput({ birthDate: '1990-02-30' }));
    expect((await service.parseContact({ ...joseInput, birthday: '1990-02-28' }))?.birthDate).toBeNull();

    mockCompletion(service, aiOutput({ birthDate: '1985-05-12' }));
    expect((await service.parseContact(joseInput))?.birthDate).toBeNull();

    mockCompletion(service, aiOutput({ birthDate: '1990-05-12' }));
    expect((await service.parseContact({ ...joseInput, birthday: '1990-05-12' }))?.birthDate).toBe('1990-05-12');
  });

  it('pausa la IA cuando OpenAI no tiene crédito', async () => {
    const service = new ContactAiParserService(buildConfig());
    // Forma real del error de OpenAI sin crédito
    const create = jest.fn().mockRejectedValue(
      Object.assign(new Error('429 You have no credits remaining'), {
        status: 429,
        code: 'credit_balance_exhausted',
        type: 'insufficient_quota',
      }),
    );
    (service as unknown as { client: unknown }).client = { chat: { completions: { create } } };

    const first = await service.parseContactDetailed(joseInput);
    expect(first.contact).toBeNull();
    expect(first.error).toContain('no tiene crédito');
    expect(service.isEnabled()).toBe(false);
    expect(service.getUnavailableReason()).toContain('no tiene crédito');
    expect(await service.parseMany([joseInput, joseInput])).toEqual([null, null]);
    expect(create).toHaveBeenCalledTimes(1);
  });

  it('solo acepta emails presentes en la entrada', async () => {
    const service = new ContactAiParserService(buildConfig());
    mockCompletion(service, aiOutput({ email: 'inventado@mail.com' }));

    const result = await service.parseContact({ ...joseInput, emails: ['Jose@Mail.com'] });

    expect(result?.email).toBe('jose@mail.com');
  });
});
