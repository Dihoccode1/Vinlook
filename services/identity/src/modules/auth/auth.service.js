import bcrypt from 'bcrypt';
import { AppError } from '../../utils/AppError.js';
import { rateBucket, assertBudget, consumeBudget } from '../../auth/rate.js';
import { issueToken } from '../../auth/token.js';
import { createAuthRepository } from './auth.repository.js';
import { registrationDto, loginDto } from './auth.dto.js';

export function createAuthService(runtime) {
  const { config, models, now, dummyHash } = runtime;
  const repository = createAuthRepository(models);
  return {
    async register(input) {
      try {
        const account = await repository.createPendingAccount({
          fullName: input.fullName,
          email: input.email,
          passwordHash: await bcrypt.hash(input.password, 12),
        });
        return registrationDto(account);
      } catch (error) {
        if (error?.code === 11000)
          throw new AppError(409, 'REGISTRATION_FAILED', 'Registration could not be completed');
        throw error;
      }
    },
    async login(input) {
      const bucket = rateBucket(config.rateKey, 'login', 'account', input.email, now());
      await assertBudget(models.AuthRateLimit, bucket, 5);
      const account = await repository.findAccountForLogin(input.email);
      const matches = await bcrypt.compare(input.password, account?.passwordHash ?? dummyHash);
      if (!matches || !account || account.status !== 'active') {
        await consumeBudget(models.AuthRateLimit, bucket, 5);
        throw new AppError(401, 'AUTHENTICATION_FAILED', 'Login could not be completed');
      }
      return loginDto(account, await issueToken(account, config, now()));
    },
  };
}
