
import { MastraAuthBetterAuth } from '@mastra/auth-better-auth'
import { LibsqlDialect } from '@libsql/kysely-libsql'
import { betterAuth, type Auth, type BetterAuthOptions } from 'better-auth'
import { admin, multiSession, oAuthProxy, oneTap, username } from 'better-auth/plugins'
import { apiKey } from '@better-auth/api-key'
import { Kysely, type ColumnType } from 'kysely'
import { log } from './config/logger'

type AuthDateColumn = ColumnType<Date, Date | string, Date | string>;
type AuthNullableDateColumn = ColumnType<
  Date | null,
  Date | string | null | undefined,
  Date | string | null | undefined
>;
type AuthNullableTextColumn = ColumnType<
  string | null,
  string | null | undefined,
  string | null | undefined
>;
type AuthNullableBooleanColumn = ColumnType<
  boolean | null,
  boolean | null | undefined,
  boolean | null | undefined
>;
type AuthNullableNumberColumn = ColumnType<
  number | null,
  number | null | undefined,
  number | null | undefined
>;

/**
 * Better Auth tables backed by LibSQL.
 *
 * The shape mirrors the current Better Auth core tables plus the user/session
 * columns added by the username/admin plugins and the API key plugin.
 */
interface BetterAuthDatabase {
  user: {
    id: string;
    name: string;
    email: string;
    emailVerified: boolean;
    image: AuthNullableTextColumn;
    createdAt: AuthDateColumn;
    updatedAt: AuthDateColumn;
    username: AuthNullableTextColumn;
    displayUsername: AuthNullableTextColumn;
    role: AuthNullableTextColumn;
    banned: AuthNullableBooleanColumn;
    banReason: AuthNullableTextColumn;
    banExpires: AuthNullableDateColumn;
  };
  session: {
    id: string;
    userId: string;
    expiresAt: AuthDateColumn;
    token: string;
    ipAddress: AuthNullableTextColumn;
    userAgent: AuthNullableTextColumn;
    createdAt: AuthDateColumn;
    updatedAt: AuthDateColumn;
    impersonatedBy: AuthNullableTextColumn;
  };
  account: {
    id: string;
    userId: string;
    providerId: string;
    accountId: string;
    accessToken: AuthNullableTextColumn;
    refreshToken: AuthNullableTextColumn;
    idToken: AuthNullableTextColumn;
    accessTokenExpiresAt: AuthNullableDateColumn;
    refreshTokenExpiresAt: AuthNullableDateColumn;
    scope: AuthNullableTextColumn;
    password: AuthNullableTextColumn;
    createdAt: AuthDateColumn;
    updatedAt: AuthDateColumn;
  };
  verification: {
    id: string;
    identifier: string;
    value: string;
    expiresAt: AuthDateColumn;
    createdAt: AuthDateColumn;
    updatedAt: AuthDateColumn;
  };
  apikey: {
    id: string;
    configId: string;
    name: AuthNullableTextColumn;
    start: AuthNullableTextColumn;
    referenceId: string;
    prefix: AuthNullableTextColumn;
    key: string;
    refillInterval: AuthNullableNumberColumn;
    refillAmount: AuthNullableNumberColumn;
    lastRefillAt: AuthNullableDateColumn;
    enabled: boolean;
    rateLimitEnabled: boolean;
    rateLimitTimeWindow: AuthNullableNumberColumn;
    rateLimitMax: AuthNullableNumberColumn;
    requestCount: AuthNullableNumberColumn;
    remaining: AuthNullableNumberColumn;
    lastRequest: AuthNullableDateColumn;
    expiresAt: AuthNullableDateColumn;
    createdAt: AuthDateColumn;
    updatedAt: AuthDateColumn;
    permissions: AuthNullableTextColumn;
    metadata: AuthNullableTextColumn;
  };
}

const isDevelopment = process.env.NODE_ENV !== 'production'

function trimTrailingSlash(url: string): string {
  return url.replace(/\/+$/, '')
}

/**
 * Normalizes legacy OAuth callback env values onto Better Auth's default
 * Next.js callback route so older local env files do not break Google sign-in.
 */
function resolveGoogleRedirectUri(baseUrl: string): string {
  const configuredRedirectUri = process.env.GOOGLE_CLIENT_CALLBACK_URL?.trim()
  const defaultRedirectUri = `${trimTrailingSlash(baseUrl)}/api/auth/callback/google`

  if (!configuredRedirectUri) {
    return defaultRedirectUri
  }

  if (/\/api\/callback\/?$/.test(configuredRedirectUri)) {
    log.warn('Normalizing legacy Google callback URL', {
      configuredRedirectUri,
      normalizedRedirectUri: defaultRedirectUri,
    })
    return defaultRedirectUri
  }

  return configuredRedirectUri
}

const baseURL =
  process.env.BETTER_AUTH_URL?.trim() ??
  process.env.NEXT_PUBLIC_BETTER_AUTH_URL?.trim() ??
  (isDevelopment ? 'http://localhost:3000' : undefined)

const trustedOrigins = [
  process.env.BETTER_AUTH_TRUSTED_ORIGIN?.trim(),
  process.env.NEXT_PUBLIC_BETTER_AUTH_URL?.trim(),
  baseURL,
  isDevelopment ? 'http://localhost:3000' : undefined,
  isDevelopment ? 'http://127.0.0.1:3000' : undefined,
].filter((origin, index, values): origin is string => Boolean(origin) && values.indexOf(origin) === index)

const socialProviders: BetterAuthOptions['socialProviders'] = {}
const githubClientId = process.env.GITHUB_CLIENT_ID?.trim()
const githubClientSecret = process.env.GITHUB_CLIENT_SECRET?.trim()
const googleClientId = process.env.GOOGLE_CLIENT_ID?.trim()
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim()

if (githubClientId && githubClientSecret) {
  socialProviders.github = {
    clientId: githubClientId,
    clientSecret: githubClientSecret,
  }
}

if (googleClientId && googleClientSecret && baseURL) {
  socialProviders.google = {
    clientId: googleClientId,
    clientSecret: googleClientSecret,
    redirectURI: resolveGoogleRedirectUri(baseURL),
  }
}

const authDatabase = new Kysely<BetterAuthDatabase>({
  dialect: new LibsqlDialect({
    url: process.env.TURSO_DATABASE_URL ?? process.env.TURSO_URL ?? 'file:./database.db',
    authToken: process.env.TURSO_AUTH_TOKEN,
  }),
});

const authOptions: BetterAuthOptions = {
  appName: 'AgentStack',
  emailAndPassword: {
    enabled: true,
  },
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
            const adminEmails = [process.env.USER_EMAIL]
            .filter((value): value is string => Boolean(value))
            .map((value) => value.trim().toLowerCase());

          if (adminEmails.includes(user.email.trim().toLowerCase())) {
            return {
              data: {
                ...user,
                role: 'admin',
              },
            };
          }

          return {
            data: {
              ...user,
              role: 'user',
            },
          };
        },
      },
    },
  },
  trustedOrigins,
  database: {
    db: authDatabase,
    type: 'sqlite',
  },
  socialProviders,
  baseURL: process.env.BETTER_AUTH_URL ?? 'http://localhost:3000',
  secret: process.env.BETTER_AUTH_SECRET ?? 'supersecret',
  plugins: [
    username(),
    admin(),
    multiSession(),
    apiKey({
      enableSessionForAPIKeys: true,
    }),
    oneTap(),
    oAuthProxy({
      productionURL: process.env.BETTER_AUTH_PRODUCTION_URL ?? baseURL,
    }),
  ],
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // Cache duration in seconds
    },
  },
};

const authBetter = betterAuth(authOptions);

export const auth = authBetter as Auth;

/**
 * Mastra auth bridge wired to the Better Auth instance.
 */
export const mastraAuth = new MastraAuthBetterAuth({
  auth,
  signUpEnabled: true,
})

