export function isValidString(str: string): boolean {
  return (str ?? '').trim() !== ''
}
