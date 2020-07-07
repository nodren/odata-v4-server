import { randomInt } from '../../lib/utils';

/**
 * generate random port
 */
export function randomPort() {
  let pt = randomInt(3000, 10000)
  for (; ;) {
    if (randomPort['cache'].has(pt)) {
      pt = randomInt(5000, 60000)
    } else {
      break
    }
  }
  randomPort['cache'].add(pt)
  return pt
}

randomPort['cache'] = new Set();