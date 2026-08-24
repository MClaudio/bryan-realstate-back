import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { google, people_v1 } from 'googleapis';
import { normalizeEmail, normalizePhone } from '../sync-contacts/utils/contact-normalization';
import { formatPhoneNumber } from '../utils/phoneFormatter';

export interface GoogleContactPayload {
  googleContactId?: string | null;
  fullName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  biography?: string | null;
}

@Injectable()
export class GoogleContactsService {
  private readonly logger = new Logger(GoogleContactsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  getAuthorizationUrl(): string {
    const client = this.createOAuthClient();
    const scopeConfig =
      this.configService.get<string>('GOOGLE_SCOPE') ?? 'https://www.googleapis.com/auth/contacts';

    const scopes = scopeConfig
      .split(/[\s,]+/)
      .map((scope) => scope.trim())
      .filter(Boolean);

    return client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: scopes,
    });
  }

  async exchangeCodeForTokens(code: string) {
    const client = this.createOAuthClient();
    const { tokens } = await client.getToken(code);

    if (!tokens.access_token) {
      throw new BadRequestException('No se pudo obtener access_token de Google');
    }

    await this.persistTokens(tokens);

    return {
      hasRefreshToken: Boolean(tokens.refresh_token),
      expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null,
    };
  }

  async getTokenStatus() {
    const token = await this.prisma.googleAuthToken.findUnique({
      where: { provider: 'google' },
    });

    if (!token) {
      return {
        connected: false,
        needsReauth: false,
        hasRefreshToken: false,
        expiresAt: null,
        lastRefreshAt: null,
        lastError: null,
      };
    }

    return {
      connected: !token.needsReauth,
      needsReauth: token.needsReauth,
      hasRefreshToken: Boolean(token.refreshToken),
      expiresAt: token.expiryDate ? token.expiryDate.toISOString() : null,
      lastRefreshAt: token.lastRefreshAt ? token.lastRefreshAt.toISOString() : null,
      lastError: token.lastError,
    };
  }

  async listAllContacts(): Promise<GoogleContactPayload[]> {
    const people = await this.getPeopleClient();
    const contacts: GoogleContactPayload[] = [];
    let pageToken: string | undefined;

    do {
      const response = await this.withRetry(() =>
        people.people.connections.list({
          resourceName: 'people/me',
          personFields: 'names,emailAddresses,phoneNumbers,biographies,metadata',
          pageSize: 1000,
          pageToken,
          sortOrder: 'FIRST_NAME_ASCENDING',
        }),
      );

      const connections = response.data.connections ?? [];
      for (const person of connections) {
        contacts.push(this.mapPerson(person));
      }

      pageToken = response.data.nextPageToken ?? undefined;
    } while (pageToken);

    return contacts;
  }

  async findDuplicateContactByEmailOrPhone(email?: string | null, phone?: string | null) {
    const normalizedEmail = normalizeEmail(email);
    const normalizedPhone = normalizePhone(phone);

    if (!normalizedEmail && !normalizedPhone) {
      return null;
    }

    const people = await this.getPeopleClient();
    const queries = [normalizedEmail, normalizedPhone].filter(Boolean) as string[];

    for (const query of queries) {
      const response = await this.withRetry(() =>
        people.people.searchContacts({
          query,
          readMask: 'names,emailAddresses,phoneNumbers,biographies,metadata',
          pageSize: 30,
        }),
      );

      const results = response.data.results ?? [];
      const exactMatch = results.find((result) => {
        const person = result.person;
        if (!person) return false;

        const personEmail = normalizeEmail(person.emailAddresses?.[0]?.value ?? null);
        const personPhone = normalizePhone(person.phoneNumbers?.[0]?.value ?? null);

        if (normalizedEmail && personEmail === normalizedEmail) return true;
        if (normalizedPhone && personPhone === normalizedPhone) return true;

        return false;
      });

      if (exactMatch?.person) {
        return this.mapPerson(exactMatch.person);
      }
    }

    return null;
  }

  async createContact(contact: GoogleContactPayload): Promise<GoogleContactPayload> {
    const people = await this.getPeopleClient();

    const firstName = contact.firstName?.trim() || 'Sin';
    const lastName = contact.lastName?.trim() || 'Nombre';
    const email = normalizeEmail(contact.email);
    const rawPhone = contact.phone?.trim() ?? null;
    const phone = rawPhone
      ? (() => {
          const { formatted, isValid } = formatPhoneNumber(rawPhone);
          return isValid ? formatted : null;
        })()
      : null;

    const created = await this.withRetry(() =>
      people.people.createContact({
        requestBody: {
          names: [
            {
              givenName: firstName,
              familyName: lastName,
              displayName: `${firstName} ${lastName}`.trim(),
            },
          ],
          emailAddresses: email ? [{ value: email }] : undefined,
          phoneNumbers: phone ? [{ value: phone }] : undefined,
          biographies: contact.biography ? [{ value: contact.biography, contentType: 'TEXT_PLAIN' }] : undefined,
        },
      }),
    );

    return this.mapPerson(created.data);
  }

  async updateContact(
    googleContactId: string,
    contact: GoogleContactPayload,
  ): Promise<GoogleContactPayload> {
    const people = await this.getPeopleClient();

    // Get current etag (required by People API for updates)
    const current = await this.withRetry(() =>
      people.people.get({
        resourceName: googleContactId,
        personFields: 'names,emailAddresses,phoneNumbers,biographies,metadata',
      }),
    );

    const etag = current.data.etag;
    const firstName = contact.firstName?.trim() || 'Sin';
    const lastName = contact.lastName?.trim() || 'Nombre';
    const email = normalizeEmail(contact.email);
    const rawPhone = contact.phone?.trim() ?? null;
    const phone = rawPhone
      ? (() => {
          const { formatted, isValid } = formatPhoneNumber(rawPhone);
          return isValid ? formatted : null;
        })()
      : null;

    const updated = await this.withRetry(() =>
      people.people.updateContact({
        resourceName: googleContactId,
        updatePersonFields: 'names,emailAddresses,phoneNumbers,biographies',
        requestBody: {
          etag,
          names: [
            {
              givenName: firstName,
              familyName: lastName,
              displayName: `${firstName} ${lastName}`.trim(),
            },
          ],
          emailAddresses: email ? [{ value: email }] : [],
          phoneNumbers: phone ? [{ value: phone }] : [],
          biographies: contact.biography ? [{ value: contact.biography, contentType: 'TEXT_PLAIN' }] : [],
        },
      }),
    );

    return this.mapPerson(updated.data);
  }

  private async getPeopleClient() {
    const oauthClient = await this.getAuthorizedClient();
    return google.people({ version: 'v1', auth: oauthClient });
  }

  private createOAuthClient(): InstanceType<typeof google.auth.OAuth2> {
    const clientId = this.configService.get<string>('GOOGLE_CLIENT_ID');
    const clientSecret = this.configService.get<string>('GOOGLE_CLIENT_SECRET');
    const redirectUri = this.configService.get<string>('GOOGLE_REDIRECT_URI');

    if (!clientId || !clientSecret || !redirectUri) {
      throw new BadRequestException(
        'Faltan GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET o GOOGLE_REDIRECT_URI en variables de entorno',
      );
    }

    return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
  }

  /**
   * Fuerza una obtención/renovación de access token, manteniendo vivo el
   * refresh_token cuando el sistema está inactivo (Google los invalida tras ~6 meses sin uso).
   */
  async ensureFreshToken(): Promise<{ expiresAt: string | null }> {
    const oauthClient = await this.getAuthorizedClient();
    const expiryDate = oauthClient.credentials.expiry_date;
    return { expiresAt: expiryDate ? new Date(expiryDate).toISOString() : null };
  }

  private async getAuthorizedClient(): Promise<InstanceType<typeof google.auth.OAuth2>> {
    const oauthClient = this.createOAuthClient();
    const token = await this.prisma.googleAuthToken.findUnique({
      where: { provider: 'google' },
    });

    if (!token) {
      throw new BadRequestException('Google no está conectado. Autoriza la aplicación primero.');
    }

    if (token.needsReauth) {
      throw new BadRequestException(
        'La autorización de Google expiró o fue revocada. Vuelve a conectar Google Contacts.',
      );
    }

    oauthClient.setCredentials({
      access_token: token.accessToken,
      refresh_token: token.refreshToken ?? undefined,
      expiry_date: token.expiryDate ? token.expiryDate.getTime() : undefined,
      token_type: token.tokenType ?? undefined,
      scope: token.scope ?? undefined,
    });

    oauthClient.on('tokens', (tokens) => {
      void this.persistTokens(tokens).catch((error: unknown) => {
        this.logger.error('No se pudieron persistir tokens renovados de Google', error as Error);
      });
    });

    const REFRESH_MARGIN_MS = 5 * 60_000;
    const isExpired = token.expiryDate
      ? token.expiryDate.getTime() <= Date.now() + REFRESH_MARGIN_MS
      : true;

    if (isExpired && token.refreshToken) {
      try {
        const accessTokenResponse = await oauthClient.getAccessToken();
        if (!accessTokenResponse.token) {
          throw new BadRequestException('Google no devolvió un access_token al renovar');
        }
      } catch (error) {
        if (await this.handleInvalidGrantError(error)) {
          throw new BadRequestException(
            'La autorización de Google expiró o fue revocada. Vuelve a conectar Google Contacts.',
          );
        }
        throw error;
      }
    }

    return oauthClient;
  }

  private async persistTokens(tokens: InstanceType<typeof google.auth.OAuth2>['credentials']) {
    const existing = await this.prisma.googleAuthToken.findUnique({
      where: { provider: 'google' },
    });

    const accessToken = tokens.access_token ?? existing?.accessToken;
    if (!accessToken) {
      throw new BadRequestException('No se pudo persistir token de Google sin access_token');
    }

    await this.prisma.googleAuthToken.upsert({
      where: { provider: 'google' },
      create: {
        provider: 'google',
        accessToken,
        refreshToken: tokens.refresh_token ?? null,
        tokenType: tokens.token_type ?? null,
        scope: tokens.scope ?? null,
        expiryDate: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
        needsReauth: false,
        lastError: null,
        lastRefreshAt: new Date(),
      },
      update: {
        accessToken,
        refreshToken: tokens.refresh_token ?? existing?.refreshToken ?? null,
        tokenType: tokens.token_type ?? existing?.tokenType ?? null,
        scope: tokens.scope ?? existing?.scope ?? null,
        expiryDate: tokens.expiry_date ? new Date(tokens.expiry_date) : existing?.expiryDate ?? null,
        needsReauth: false,
        lastError: null,
        lastRefreshAt: new Date(),
      },
    });
  }

  private mapPerson(person: people_v1.Schema$Person): GoogleContactPayload {
    const firstName = person.names?.[0]?.givenName ?? null;
    const lastName = person.names?.[0]?.familyName ?? null;
    const fullName =
      person.names?.[0]?.displayName ?? (`${firstName ?? ''} ${lastName ?? ''}`.trim() || null);
    const rawPhone = person.phoneNumbers?.[0]?.value?.trim() || null;

    return {
      googleContactId: person.resourceName ?? null,
      firstName,
      lastName,
      fullName,
      email: normalizeEmail(person.emailAddresses?.[0]?.value ?? null),
      // Keep the original international representation from Google (+country code)
      // so cron can apply formatPhoneNumber consistently without losing country info.
      phone: rawPhone,
      biography: person.biographies?.[0]?.value?.trim() || null,
    };
  }

  private async withRetry<T>(callback: () => Promise<T>, maxAttempts = 3): Promise<T> {
    let currentError: unknown;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        return await callback();
      } catch (error) {
        currentError = error;

        if (await this.handleInvalidGrantError(error)) {
          throw new BadRequestException(
            'La autorización de Google expiró o fue revocada. Vuelve a conectar Google Contacts.',
          );
        }

        const status =
          (error as { code?: number })?.code ??
          (error as { response?: { status?: number } })?.response?.status;

        const shouldRetry = status === 429 || status === 500 || status === 502 || status === 503;
        if (!shouldRetry || attempt === maxAttempts) {
          throw error;
        }

        const backoffMs = 250 * 2 ** (attempt - 1);
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
      }
    }

    throw currentError;
  }

  private async handleInvalidGrantError(error: unknown): Promise<boolean> {
    const gaxiosError = error as {
      message?: string;
      response?: { data?: { error?: string; error_description?: string } };
    };

    const message = gaxiosError.message?.toLowerCase() ?? '';
    const responseError = gaxiosError.response?.data?.error?.toLowerCase() ?? '';
    const responseDescription = gaxiosError.response?.data?.error_description?.toLowerCase() ?? '';

    const isInvalidGrant =
      message.includes('invalid_grant') ||
      responseError === 'invalid_grant' ||
      responseDescription.includes('invalid_grant');

    if (!isInvalidGrant) {
      return false;
    }

    this.logger.error('Google OAuth devolvió invalid_grant. Se requiere reconectar la cuenta de Google.');
    await this.prisma.googleAuthToken.updateMany({
      where: { provider: 'google' },
      data: {
        needsReauth: true,
        lastError: gaxiosError.response?.data?.error_description ?? gaxiosError.message ?? 'invalid_grant',
      },
    });
    return true;
  }
}
