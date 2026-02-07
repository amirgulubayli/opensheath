import { randomUUID } from "node:crypto";

import type {
  OAuthExchangeRequest,
  OAuthExchangeResponse,
  SessionDto,
  SignInRequest,
  SignUpRequest,
} from "@ethoxford/contracts";

import { DomainError } from "./shared.js";

export interface AuthService {
  signUp(input: SignUpRequest): Promise<SessionDto>;
  signIn(input: SignInRequest): Promise<SessionDto>;
  signInWithOAuth(input: OAuthExchangeRequest): Promise<OAuthExchangeResponse>;
  refreshSession(sessionId: string): Promise<SessionDto>;
  requireSession(sessionId: string): Promise<SessionDto>;
  signOut(sessionId: string): Promise<void>;
}

interface UserRecord {
  userId: string;
  email: string;
  password: string;
  workspaceId: string;
}

const DEFAULT_USER: UserRecord = {
  userId: "usr_default",
  email: "admin@example.com",
  password: "password123",
  workspaceId: "ws_default",
};

export class InMemoryAuthService implements AuthService {
  private readonly usersByEmail = new Map<string, UserRecord>();
  private readonly usersById = new Map<string, UserRecord>();
  private readonly oauthAccountToUserId = new Map<string, string>();
  private readonly sessionsById = new Map<string, SessionDto>();

  constructor(seedUsers: UserRecord[] = [DEFAULT_USER]) {
    for (const user of seedUsers) {
      this.usersByEmail.set(user.email.toLowerCase(), user);
      this.usersById.set(user.userId, user);
    }
  }

  private normalizeEmail(email: string): string {
    return email.toLowerCase().trim();
  }

  private createSession(user: UserRecord): SessionDto {
    const session: SessionDto = {
      sessionId: `sess_${randomUUID()}`,
      userId: user.userId,
      workspaceId: user.workspaceId,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
    };

    this.sessionsById.set(session.sessionId, session);
    return session;
  }

  private createUser(input: {
    email: string;
    password: string;
    workspaceId?: string;
  }): UserRecord {
    const user: UserRecord = {
      userId: `usr_${randomUUID()}`,
      email: this.normalizeEmail(input.email),
      password: input.password,
      workspaceId: input.workspaceId?.trim() || `ws_${randomUUID()}`,
    };

    this.usersByEmail.set(user.email, user);
    this.usersById.set(user.userId, user);
    return user;
  }

  async signUp(input: SignUpRequest): Promise<SessionDto> {
    const email = this.normalizeEmail(input.email);
    const password = input.password.trim();

    if (!email || !password) {
      throw new DomainError("validation_denied", "email and password are required", {
        field: "email,password",
      });
    }

    if (this.usersByEmail.has(email)) {
      throw new DomainError("conflict", "Account already exists", {
        reason: "email_already_registered",
      });
    }

    const user = this.createUser({
      email,
      password,
      ...(input.workspaceId ? { workspaceId: input.workspaceId } : {}),
    });

    return this.createSession(user);
  }

  async signIn(input: SignInRequest): Promise<SessionDto> {
    const email = this.normalizeEmail(input.email);
    const user = this.usersByEmail.get(email);

    if (!user || user.password !== input.password) {
      throw new DomainError("auth_denied", "Invalid credentials", {
        reason: "invalid_credentials",
      });
    }

    return this.createSession(user);
  }

  async signInWithOAuth(input: OAuthExchangeRequest): Promise<OAuthExchangeResponse> {
    const email = this.normalizeEmail(input.email);
    const providerAccountId = input.providerAccountId.trim().toLowerCase();
    const authorizationCode = input.authorizationCode.trim();
    const state = input.state.trim();

    if (!email || !providerAccountId || !authorizationCode || !state) {
      throw new DomainError("validation_denied", "OAuth exchange payload is invalid", {
        field: "email,providerAccountId,authorizationCode,state",
      });
    }

    const oauthKey = `${input.provider}:${providerAccountId}`;
    const linkedUserId = this.oauthAccountToUserId.get(oauthKey);
    let user: UserRecord | undefined;
    let linkStatus: OAuthExchangeResponse["linkStatus"] = "linked_existing";

    if (linkedUserId) {
      user = this.usersById.get(linkedUserId);
    }

    if (!user) {
      user = this.usersByEmail.get(email);

      if (!user) {
        user = this.createUser({
          email,
          password: `oauth_${randomUUID()}`,
          ...(input.workspaceId ? { workspaceId: input.workspaceId } : {}),
        });
        linkStatus = "created_new";
      }

      this.oauthAccountToUserId.set(oauthKey, user.userId);
    }

    return {
      session: this.createSession(user),
      provider: input.provider,
      linkStatus,
    };
  }

  async refreshSession(sessionId: string): Promise<SessionDto> {
    const session = await this.requireSession(sessionId);
    this.sessionsById.delete(sessionId);

    const user = this.usersById.get(session.userId);
    if (!user) {
      throw new DomainError("auth_denied", "Missing or invalid session", {
        reason: "session_user_not_found",
      });
    }

    return this.createSession(user);
  }

  async requireSession(sessionId: string): Promise<SessionDto> {
    const session = this.sessionsById.get(sessionId);

    if (!session) {
      throw new DomainError("auth_denied", "Missing or invalid session", {
        reason: "session_not_found",
      });
    }

    if (Date.parse(session.expiresAt) <= Date.now()) {
      this.sessionsById.delete(sessionId);
      throw new DomainError("auth_denied", "Session expired", {
        reason: "session_expired",
      });
    }

    return session;
  }

  async signOut(sessionId: string): Promise<void> {
    this.sessionsById.delete(sessionId);
  }
}
