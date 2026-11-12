export function read_object(path: string): Promise<Buffer | undefined>;
export function write_object(path: string, content: Buffer, contentType: string): Promise<void>;
