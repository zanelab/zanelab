declare module 'sm-crypto' {
  export const sm4: {
    encrypt(
      plaintext: string,
      key: string,
      options?: { mode?: 'ECB' | 'CBC' },
    ): string;
    decrypt(
      ciphertext: string,
      key: string,
      options?: { mode?: 'ECB' | 'CBC' },
    ): string;
  };
}
