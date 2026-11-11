/** Shared HTTP lifecycle. Services keep their routes and business rules in their own modules. */
export function read_port(value, fallback, name = 'PORT') {
  const port = Number(value ?? fallback);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`${name} must be an integer between 1 and 65535`);
  }
  return port;
}

export function start_server({ app, port, name, host = '0.0.0.0', onClose }) {
  const server = app.listen(port, host, () => console.log(`${name} listening on ${port}`));
  let stopping = false;
  for (const signal of ['SIGINT', 'SIGTERM']) {
    process.once(signal, () => {
      if (stopping) return;
      stopping = true;
      const deadline = setTimeout(() => process.exit(1), 10_000);
      deadline.unref();
      server.close(async (error) => {
        try {
          await onClose?.();
          process.exitCode = error ? 1 : 0;
        } catch {
          console.error(`${name}: unable to close resources`);
          process.exitCode = 1;
        } finally {
          clearTimeout(deadline);
        }
      });
      server.closeIdleConnections();
    });
  }
  return server;
}
