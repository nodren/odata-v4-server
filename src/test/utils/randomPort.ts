import { randomInt } from '../../lib/utils';

export function randomPort() {
  let pt = randomInt(5000, 60000)
  if (randomPort['cache'].has(pt)) {
    pt = randomInt(5000, 60000)
  }
  randomPort['cache'].add(pt)
  return pt
}

randomPort['cache'] = new Set();