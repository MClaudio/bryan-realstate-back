import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { google, people_v1 } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
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

  private createOAuthClient(): OAuth2Client {
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

  private async getAuthorizedClient(): Promise<OAuth2Client> {
    const oauthClient = this.createOAuthClient();
    const token = await this.prisma.googleAuthToken.findUnique({
      where: { provider: 'google' },
    });

    if (!token) {
      throw new BadRequestException('Google no está conectado. Autoriza la aplicación primero.');
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

    const isExpired = token.expiryDate ? token.expiryDate.getTime() <= Date.now() : false;
    if (isExpired && token.refreshToken) {
      const { credentials } = await oauthClient.refreshAccessToken();
      await this.persistTokens(credentials);
      oauthClient.setCredentials(credentials);
    }

    return oauthClient;
  }

  private async persistTokens(tokens: OAuth2Client['credentials']) {
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
      },
      update: {
        accessToken,
        refreshToken: tokens.refresh_token ?? existing?.refreshToken ?? null,
        tokenType: tokens.token_type ?? existing?.tokenType ?? null,
        scope: tokens.scope ?? existing?.scope ?? null,
        expiryDate: tokens.expiry_date ? new Date(tokens.expiry_date) : existing?.expiryDate ?? null,
      },
    });
  }

  private mapPerson(person: people_v1.Schema$Person): GoogleContactPayload {
    const firstName = person.names?.[0]?.givenName ?? null;
    const lastName = person.names?.[0]?.familyName ?? null;
    const fullName =
      person.names?.[0]?.displayName ?? (`${firstName ?? ''} ${lastName ?? ''}`.trim() || null);

    return {
      googleContactId: person.resourceName ?? null,
      firstName,
      lastName,
      fullName,
      email: normalizeEmail(person.emailAddresses?.[0]?.value ?? null),
      phone: normalizePhone(person.phoneNumbers?.[0]?.value ?? null),
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
}
