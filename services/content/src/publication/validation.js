import {z} from 'zod';
import {languageCodes} from '../models/index.js';
import {objectId,version} from '../drafts/validation.js';
export const locale=z.enum(languageCodes);
const reason=z.string().trim().min(1).max(500);
export const reviewInput=z.discriminatedUnion('decision',[
 z.strictObject({expectedEditVersion:version,expectedTextVersion:version.min(1),decision:z.literal('approved')}),
 z.strictObject({expectedEditVersion:version,expectedTextVersion:version.min(1),decision:z.literal('changes_required'),reason}),
]);
export const submitInput=z.strictObject({expectedEditVersion:version});
export const returnInput=submitInput.extend({reason});
export const publishInput=submitInput.extend({expectedPublishedRevisionId:objectId.nullable(),confirmGeography:z.literal(true)});
const identifier=z.string().trim().min(1).max(200).refine(v=>!/[\x00-\x1f\x7f]/.test(v));
const registrySchema=z.strictObject({registryVersion:z.string().regex(/^[A-Za-z0-9._-]{1,100}$/),
 languages:z.strictObject(Object.fromEntries(languageCodes.map(code=>[code,z.strictObject({voiceOrModelId:identifier})])))});
// Snapshot, validate and freeze; callers must supply an actually approved manifest.
export function approvedRegistry(value){
 const parsed=registrySchema.safeParse(value);if(!parsed.success)return null;
 for(const entry of Object.values(parsed.data.languages))Object.freeze(entry);
 Object.freeze(parsed.data.languages);return Object.freeze(parsed.data);
}
