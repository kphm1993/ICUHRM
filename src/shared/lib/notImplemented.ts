export function notImplemented(feature: string): Error {
  return new Error(`${feature} is not implemented yet.`);
}

