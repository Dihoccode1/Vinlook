import type { Server } from 'node:http';

export function read_port(value: string | undefined, fallback: number, name?: string): number;
export function start_server(options: {
  app: { listen(port: number, host: string, listening: () => void): Server };
  port: number;
  name: string;
  host?: string;
  onClose?: () => void | Promise<void>;
}): Server;
