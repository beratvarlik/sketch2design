// Gerçek cüzdan / zincir verisi bağlanana kadar kullanılan sahte değerler.
// Hepsi burada toplanır; gerçeğiyle değiştirirken yalnızca bu dosyaya dokun.

export const WALLET_ADDRESS = "0x3f8A5d2c7B1e90F4a6C3d8E1b7a49F02c6D59a2C";
export const NETWORK_NAME = "Monad Testnet";

export const SKETCH_HASH = "0x9f3a…c21e";
export const SPEC_HASH = "0x41d7…8b02";
export const TX_HASH = "0x7c2e…a913";

export const EXPLORER_TX_URL = "#";

/** 0x3f8A…9a2C biçimine kısaltır. */
export function shortAddress(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}
