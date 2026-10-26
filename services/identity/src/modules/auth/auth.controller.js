import { createAuthService } from './auth.service.js';
import { loginInput, registrationInput } from './auth.validation.js';
import { validateInput } from '../../middlewares/validate.middleware.js';

export function createAuthController(runtime) {
  const service = createAuthService(runtime);
  return {
    async register(request, response) {
      const input = validateInput(registrationInput, request.body);
      const data = await service.register(input);
      return response.status(201).json({ data, requestId: response.locals.requestId });
    },
    async login(request, response) {
      const input = validateInput(loginInput, request.body);
      const data = await service.login(input);
      return response.json({ data, requestId: response.locals.requestId });
    },
  };
}
