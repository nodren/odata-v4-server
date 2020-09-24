import { uniq } from '@newdash/newdash/uniq';
import { distance } from './string_distance';

/**
 * get closest string from dict
 *
 * @param input
 * @param dict
 */
export function closestString(input: string, dict: Array<string>): string {
  if (dict === undefined || dict.length === 0) {
    return input;
  }

  dict = uniq(dict);

  if (input === undefined || input?.length === 0) {
    return dict[0];
  }

  if (dict.includes(input)) {
    return input;
  }

  const sortedResult = dict.map(
    (s) => ({ value: s, distance: distance(input, s) })
  ).sort((o1, o2) => o1.distance - o2.distance);

  return sortedResult[0].value;

}
