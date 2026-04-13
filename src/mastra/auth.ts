
import { MastraAuthBetterAuth } from '@mastra/auth-better-auth'
import { LibsqlDialect } from '@libsql/kysely-libsql'
import { betterAuth, type Auth, type BetterAuthOptions } from 'better-auth'
import { admin, multiSession, oAuthProxy, username } from 'better-auth/plugins'
import { apiKey } from '@better-auth/api-key'
import { Kysely, type ColumnType } from 'kysely'

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
const githubClientId = process.env.GITHUB_CLIENT_ID?.trim()
const githubClientSecret = process.env.GITHUB_CLIENT_SECRET?.trim()

const trustedOrigins = [
  process.env.BETTER_AUTH_TRUSTED_ORIGIN,
  isDevelopment ? 'http://localhost:3000' : undefined,
].filter((origin): origin is string => Boolean(origin))

const baseURL =
  process.env.BETTER_AUTH_URL ?? (isDevelopment ? 'http://localhost:3000' : undefined)

const socialProviders: BetterAuthOptions['socialProviders'] = {}

if (githubClientId && githubClientSecret) {
  socialProviders.github = {
    clientId: githubClientId,
    clientSecret: githubClientSecret,
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
  socialProviders: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID ?? '',
      clientSecret: process.env.GITHUB_CLIENT_SECRET ?? '',
    },
  },
  baseURL: process.env.BETTER_AUTH_URL ?? 'http://localhost:3000',
  secret: process.env.BETTER_AUTH_SECRET ?? 'supersecret',
  plugins: [
    username(),
    admin(),
    multiSession(),
    apiKey({
      enableSessionForAPIKeys: true,
    }),
    oAuthProxy({
      productionURL:
        process.env.BETTER_AUTH_PRODUCTION_URL ?? process.env.BETTER_AUTH_URL,
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


