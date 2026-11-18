/**
 * Display formatting only. Labels shown to people are Title Case ("Bedroom: Wall", "Move-In").
 * API identifiers (shot ids, categories, phases) are never passed through this.
 */
const MINOR = new Set(['a', 'an', 'the', 'and', 'or', 'of', 'on', 'in', 'to', 'for', 'by', 'at', 'with']);

export function titleCase(text: string): string {
  let first = true;
  return text.replace(/[A-Za-z][A-Za-z'’]*/g, (word, offset: number) => {
    const afterBreak = offset === 0 || /[:;.]\s*$/.test(text.slice(0, offset)) || /-$/.test(text.slice(0, offset));
    const keepLower = !first && !afterBreak && MINOR.has(word.toLowerCase());
    first = false;
    return keepLower ? word.toLowerCase() : word.charAt(0).toUpperCase() + word.slice(1);
  });
}

/** "bedroom" + "wall" becomes "Bedroom: Wall". */
export function areaLabel(room: string, item: string): string {
  return titleCase(`${room}: ${item}`);
}
