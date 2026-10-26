export function schemaOptions(collection, hidden = []) {
  const transform = (_document, result) => {
    for (const field of hidden) delete result[field];
    return result;
  };
  return {
    collection,
    strict: 'throw',
    autoCreate: false,
    autoIndex: false,
    bufferCommands: false,
    versionKey: false,
    toJSON: { transform },
    toObject: { transform },
  };
}
