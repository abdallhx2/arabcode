declare module "bidi-js" {
  export interface EmbeddingLevels {
    levels: Uint8Array
    paragraphs: { start: number; end: number; level: number }[]
  }
  export interface Bidi {
    /** حساب مستويات التضمين (UAX#9). بدون اتجاه صريح يُكتشف من أول حرف قوي. */
    getEmbeddingLevels(text: string, explicitDirection?: "ltr" | "rtl"): EmbeddingLevels
    /** نطاقات [بداية، نهاية] (inclusive) تُقلب بالتتابع للوصول للترتيب البصري. */
    getReorderSegments(text: string, embeddingLevels: EmbeddingLevels, start?: number, end?: number): [number, number][]
    /** تنبيه: تأخذ مصفوفة المستويات الخام (levels.levels) وليس الكائن الكامل. */
    getMirroredCharactersMap(text: string, levels: Uint8Array, start?: number, end?: number): Map<number, string>
    getMirroredCharacter(char: string): string | null
    getBidiCharTypeName(char: string): string
  }
  export default function bidiFactory(): Bidi
}
