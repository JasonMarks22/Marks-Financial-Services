/**
 * Editorial photography, hotlinked from Unsplash's CDN as Unsplash's license
 * and API guidelines ask. Each entry keeps its photographer for the credit
 * line in the footer.
 */

export interface Photo {
  id: string; // Unsplash CDN id, e.g. "1534469650761-fce6cc26ac0d"
  alt: string;
  credit: string;
}

export function photoUrl(photo: Photo, width: number, height?: number): string {
  const size = height ? `&h=${height}&fit=crop` : "";
  return `https://images.unsplash.com/photo-${photo.id}?auto=format&q=75&w=${width}${size}`;
}

export const PHOTOS = {
  hero: { id: "1534469650761-fce6cc26ac0d", alt: "The New York Stock Exchange facade with American flags", credit: "Aditya Vyas" },
  savings: { id: "1633158829875-e5316a358c6f", alt: "A glass jar filled with coins", credit: "Towfiqu barbhuiya" },
  mortgage: { id: "1570129477492-45c003edd2be", alt: "A grey wooden house with a front lawn", credit: "Todd Kent" },
  budget: { id: "1484480974693-6ca0a78fb36b", alt: "A person writing a list in a notebook", credit: "Glenn Carstens-Peters" },
  debt: { id: "1563013544-824ae1b704d3", alt: "A person holding a credit card at a laptop", credit: "rupixen" },
  retirement: { id: "1533444273691-ebf51af8fd9c", alt: "An older couple sitting together on a bench", credit: "James Hose Jr" },
  allocation: { id: "1607863680198-23d4b2565df0", alt: "A pink piggy bank on a wooden table", credit: "Andre Taissin" },
  builder: { id: "1504711434969-e33886168f5c", alt: "The business section of a newspaper", credit: "AbsolutVision" },
  compare: { id: "1611974789855-9c2a0a7236a3", alt: "A candlestick stock chart on a dark screen", credit: "Maxim Hopman" },
  backtest: { id: "1648275913341-7973ae7bc9b3", alt: "A digital stock ticker display", credit: "Tyler Prahm" },
  montecarlo: { id: "1551431009-a802eeec77b1", alt: "Two dice showing sixes", credit: "Brett Jordan" },
} satisfies Record<string, Photo>;

export const PHOTO_CREDITS = Array.from(
  new Set(Object.values(PHOTOS).map((p) => p.credit)),
);
