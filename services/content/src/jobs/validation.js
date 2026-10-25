import {z} from 'zod';
import {languageCodes} from '../models/index.js';
import {version,objectId} from '../drafts/validation.js';
import {uuid} from '../durability/validation.js';
export const identifier=z.string().regex(/^[A-Za-z0-9._-]{1,64}$/);
const model=z.string().trim().min(1).max(200).refine(v=>!/[\x00-\x1f\x7f]/.test(v));
export const inputVersion=z.strictObject({sourceVersion:version.min(1),textVersion:version.min(1).nullable(),targetTextVersion:version.min(1).nullable(),targetSourceVersion:version.min(1).nullable()});
export const snapshot=z.strictObject({text:z.string().trim().min(1).max(20000),registryVersion:z.string().regex(/^[A-Za-z0-9._-]{1,100}$/),modelId:model,execution:z.enum(['local_worker','server_adapter'])});
export const manifestSchema=z.strictObject({registryVersion:z.string().regex(/^[A-Za-z0-9._-]{1,100}$/),languages:z.strictObject(Object.fromEntries(languageCodes.map(c=>[c,z.strictObject({audio:z.strictObject({execution:z.enum(['local_worker','server_adapter']),modelId:model}),translation:c==='en'?z.null():z.strictObject({execution:z.literal('server_adapter'),modelId:model})})])))});
export function manifest(value){const r=manifestSchema.safeParse(value);if(!r.success)return null;for(const entry of Object.values(r.data.languages)){Object.freeze(entry.audio);if(entry.translation)Object.freeze(entry.translation);Object.freeze(entry);}Object.freeze(r.data.languages);return Object.freeze(r.data);}
export const processInput=z.strictObject({expectedEditVersion:version,languages:z.array(z.enum(languageCodes)).min(1).max(16).refine(v=>new Set(v).size===v.length).optional()});
export const retryInput=z.strictObject({expectedEditVersion:version,acknowledgeProviderResend:z.literal(true).optional()});
export const claimInput=z.strictObject({workerId:identifier,capabilities:z.array(z.enum(languageCodes)).min(1).max(16).refine(v=>new Set(v).size===v.length)});
export const attemptInput=z.strictObject({attemptId:uuid});
export const resultInput=z.strictObject({attemptId:uuid,inputVersion,outcome:z.union([
 z.strictObject({status:z.literal('succeeded'),text:z.string().trim().min(1).max(20000)}),
 z.strictObject({status:z.literal('succeeded'),mediaIntentId:objectId}),
 z.strictObject({status:z.literal('failed'),errorCode:z.enum(['PROVIDER_FAILED','PROVIDER_OUTCOME_UNKNOWN'])}),
 z.strictObject({status:z.literal('waiting_quota'),errorCode:z.literal('QUOTA_EXHAUSTED')}),
])});
