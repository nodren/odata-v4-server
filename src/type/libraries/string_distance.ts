// @ts-nocheck

/**
 * calculate distance of two string
 *
 * @param s1
 * @param s2
 */
export function distance(s1: string = '', s2: string = ''): number {

  const s1Length = s1.length || 0;
  const s2Length = s2.length || 0;

  if (s1Length === s2Length) {
    if (s1 === s2) { return 0; }
  }

  const tmp = [];

  if (s1Length && s2Length) {

    let i1 = 0, i2 = 0, a, b, c, c2 = tmp;
    const tmp1 = tmp;

    while (i1 < s1Length) { tmp1[i1] = ++i1; }

    while (i2 < s2Length) {
      c2 = s2.charCodeAt(i2);
      a = i2;
      ++i2;
      b = i2;
      for (i1 = 0; i1 < s1Length; ++i1) {
        c = a + (s1.charCodeAt(i1) !== c2 ? 1 : 0);
        a = tmp1[i1];
        b = b < a ? (b < c ? b + 1 : c) : (a < c ? a + 1 : c);
        tmp1[i1] = b;
      }
    }

    return b;
  }

  return s1Length + s2Length;

}
