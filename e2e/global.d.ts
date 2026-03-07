// Browser APIs used inside page.evaluate() calls
declare const indexedDB: {
  databases(): Promise<Array<{ name?: string; version?: number }>>;
  deleteDatabase(name: string): void;
};
