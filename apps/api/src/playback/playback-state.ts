export interface PlaybackSessionState {
  state: 'idle' | 'loading' | 'playing' | 'paused' | 'buffering';
  currentTrackId: string | null;
  positionMs: number;
  queue: string[];
  queueIndex: number;
  shuffle: boolean;
  repeatMode: 'off' | 'one' | 'all';
  volume: number;
  revision: bigint;
}

export type PlaybackCommand =
  | { type: 'play'; trackId?: string }
  | { type: 'pause' }
  | { type: 'seek'; positionMs: number }
  | { type: 'next' }
  | { type: 'prev' }
  | { type: 'setQueue'; trackIds: string[] }
  | { type: 'reorder'; from: number; to: number }
  | { type: 'setShuffle'; enabled: boolean }
  | { type: 'setRepeat'; mode: 'off' | 'one' | 'all' }
  | { type: 'setVolume'; level: number };

export function applyCommand(
  session: PlaybackSessionState,
  command: PlaybackCommand,
): PlaybackSessionState {
  const next = { ...session, revision: session.revision + 1n };

  switch (command.type) {
    case 'play': {
      if (command.trackId) {
        next.currentTrackId = command.trackId;
        next.state = 'playing';
        next.positionMs = 0;
        const idx = next.queue.indexOf(command.trackId);
        if (idx !== -1) {
          next.queueIndex = idx;
        }
      } else if (next.state === 'paused') {
        next.state = 'playing';
      } else if (next.state === 'idle' && next.queue.length > 0) {
        next.queueIndex = 0;
        next.currentTrackId = next.queue[0] ?? null;
        next.state = 'playing';
        next.positionMs = 0;
      }
      return next;
    }

    case 'pause': {
      if (next.state === 'playing') {
        next.state = 'paused';
      }
      return next;
    }

    case 'seek': {
      next.positionMs = Math.max(0, command.positionMs);
      return next;
    }

    case 'next': {
      if (next.queue.length === 0) {
        return next;
      }

      if (next.repeatMode === 'one') {
        next.positionMs = 0;
        next.state = 'playing';
        return next;
      }

      const isAtEnd = next.queueIndex >= next.queue.length - 1;

      if (isAtEnd) {
        if (next.repeatMode === 'all') {
          next.queueIndex = 0;
          next.currentTrackId = next.queue[0] ?? null;
          next.positionMs = 0;
          next.state = 'playing';
        } else {
          next.state = 'idle';
          next.positionMs = 0;
        }
      } else {
        next.queueIndex = next.queueIndex + 1;
        next.currentTrackId = next.queue[next.queueIndex] ?? null;
        next.positionMs = 0;
        next.state = 'playing';
      }
      return next;
    }

    case 'prev': {
      if (next.queue.length === 0) {
        return next;
      }

      if (next.positionMs > 3000) {
        next.positionMs = 0;
      } else {
        const newIndex = Math.max(0, next.queueIndex - 1);
        next.queueIndex = newIndex;
        next.currentTrackId = next.queue[newIndex] ?? null;
        next.positionMs = 0;
        next.state = 'playing';
      }
      return next;
    }

    case 'setQueue': {
      next.queue = [...command.trackIds];
      next.queueIndex = 0;
      return next;
    }

    case 'reorder': {
      const queue = [...next.queue];
      const { from, to } = command;
      if (from >= 0 && from < queue.length && to >= 0 && to < queue.length) {
        const [item] = queue.splice(from, 1);
        if (item !== undefined) {
          queue.splice(to, 0, item);
        }
      }
      next.queue = queue;
      return next;
    }

    case 'setShuffle': {
      next.shuffle = command.enabled;
      return next;
    }

    case 'setRepeat': {
      next.repeatMode = command.mode;
      return next;
    }

    case 'setVolume': {
      next.volume = Math.max(0, Math.min(100, command.level));
      return next;
    }
  }
}
