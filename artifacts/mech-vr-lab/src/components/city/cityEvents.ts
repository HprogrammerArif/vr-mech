export type BotFact = {
  name: string;
  fact: string;
  color: string;
  district: string;
};

type BotFactListener = (e: BotFact) => void;
const _botFactListeners = new Set<BotFactListener>();

export const cityEvents = {
  onBotFact(fn: BotFactListener): () => void {
    _botFactListeners.add(fn);
    return () => { _botFactListeners.delete(fn); };
  },
  emitBotFact(e: BotFact): void {
    _botFactListeners.forEach(fn => fn(e));
  },
};
