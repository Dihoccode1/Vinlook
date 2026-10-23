const expected = 'v24.18.1';
if (process.version !== expected) {
 console.error(`Vinlook requires Node ${expected}; found ${process.version}.`);
 process.exitCode = 1;
}
