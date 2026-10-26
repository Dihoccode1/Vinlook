import { uuid } from '../../durability/validation.js';
import {
  parse,
  objectId,
  createInput,
  cloneInput,
  patchInput,
  languageInput,
  locale,
} from './poi.validation.js';

export function createPoiController(service) {
  const idempotencyKey = (request) => parse(uuid, request.get('Idempotency-Key'));
  return {
    create: (request, principal) =>
      service.create(parse(createInput, request.body), principal, idempotencyKey(request)),
    clone: (request, principal) =>
      service.clone(
        parse(objectId, request.params.id),
        parse(cloneInput, request.body),
        principal,
        idempotencyKey(request),
      ),
    patch: (request, principal) =>
      service.patch(parse(objectId, request.params.id), parse(patchInput, request.body), principal),
    patchLocale: (request, principal) =>
      service.patch(
        parse(objectId, request.params.id),
        parse(languageInput, request.body),
        principal,
        parse(locale, request.params.code),
      ),
    async read(request) {
      return {
        status: 200,
        body: { data: await service.read(parse(objectId, request.params.id)) },
      };
    },
  };
}
