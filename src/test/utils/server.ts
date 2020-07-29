import { Server } from 'http';

/**
 * check server ready and return listening port
 *
 * @param s server
 */
export const ready = (s: Server): Promise<number> => new Promise((resolve, reject) => {
  s.once('listening', () => {
    resolve(s.address()['port']);
  });
  s.once('error', reject);
});

/**
 * check server shutdown
 * @param s server
 */
export const shutdown = (s: Server): Promise<void> => new Promise((resolve, reject) => s.close((err) => { err ? reject(err) : resolve(); }));
