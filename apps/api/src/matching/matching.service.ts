import { Injectable } from '@nestjs/common';

import { computeConfidence } from './confidence';
import type { TrackInfo } from './confidence';

export interface MatchResult {
  confidence: number;
  status: 'auto_merged' | 'probable_pending' | 'no_link';
  signals: Record<string, number>;
  blocked?: string;
}

@Injectable()
export class MatchingService {
  decide(trackA: TrackInfo, trackB: TrackInfo): MatchResult {
    const { confidence, signals } = computeConfidence(trackA, trackB);

    let blocked: string | undefined;

    if (trackA.isLive !== trackB.isLive) {
      blocked = 'live_mismatch';
    } else if (trackA.explicit !== trackB.explicit) {
      blocked = 'explicit_mismatch';
    }

    let status: 'auto_merged' | 'probable_pending' | 'no_link';

    if (confidence >= 0.9) {
      status = blocked ? 'probable_pending' : 'auto_merged';
    } else if (confidence >= 0.5) {
      status = 'probable_pending';
    } else {
      status = 'no_link';
    }

    const result: MatchResult = { confidence, status, signals };
    if (blocked) {
      result.blocked = blocked;
    }

    return result;
  }
}
