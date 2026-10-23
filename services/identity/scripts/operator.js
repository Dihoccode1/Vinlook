import { pathToFileURL } from 'node:url';
import { emitKeypressEvents } from 'node:readline';
import { runOperator, OperatorError } from '../src/operator.js';

/** No echo for secrets; fail closed instead of reading secrets from redirected stdin. */
export function ttyPrompt(label, secret = false, input = process.stdin, output = process.stdout) {
  if (!input.isTTY || !output.isTTY || typeof input.setRawMode !== 'function') return Promise.reject(new OperatorError('OPERATOR_TTY_REQUIRED', 'An interactive terminal is required'));
  return new Promise((resolve, reject) => {
    const wasRaw = input.isRaw;
    const wasPaused = input.isPaused();
    let value = '';
    emitKeypressEvents(input);
    const done = (error) => {
      input.removeListener('keypress', keypress);
      input.removeListener('error', failed);
      input.removeListener('end', ended);
      input.setRawMode(Boolean(wasRaw));
      if (wasPaused) input.pause();
      output.write('\n');
      if (error) reject(error); else resolve(value);
    };
    const failed = () => done(new OperatorError('OPERATOR_INPUT_FAILED', 'Operator input could not be read'));
    const ended = () => done(new OperatorError('OPERATOR_INPUT_FAILED', 'Operator input ended'));
    const keypress = (text, key = {}) => {
      if (key.ctrl && ['c', 'd'].includes(key.name)) return done(new OperatorError('OPERATOR_CANCELLED', 'Operator input cancelled'));
      if (['return', 'enter'].includes(key.name)) return done();
      if (key.name === 'backspace') { if (value) { value = [...value].slice(0, -1).join(''); if (!secret) output.write('\b \b'); } return; }
      if (key.ctrl || key.meta || !text || /[\x00-\x1f\x7f]/.test(text)) return;
      value += text;
      if (value.length > 4096) return failed();
      if (!secret) output.write(text);
    };
    output.write(label);
    input.setRawMode(true); input.resume();
    input.on('keypress', keypress); input.once('error', failed); input.once('end', ended);
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    await runOperator(process.argv.slice(2), { prompt: ttyPrompt, output: line => {
      if (process.argv[2] !== '--help' && !process.stdout.isTTY) throw new OperatorError('OPERATOR_TTY_REQUIRED', 'An interactive terminal is required');
      process.stdout.write(`${line}\n`);
    } });
  } catch (error) {
    process.stderr.write(`${JSON.stringify({ error: error instanceof OperatorError ? error.code : 'OPERATOR_OPERATION_FAILED',
      failureAudit: error?.failureAudit ?? 'not_applicable' })}\n`);
    process.exitCode = 1;
  }
}
