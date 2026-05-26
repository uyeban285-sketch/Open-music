import { jaroWinkler } from './jaro-winkler';
import { normalize } from './normalize';

export interface TrackInfo {
  title: string;
  artist: string;
  album?: string;
  duration: number;
  isrc?: string;
  isLive: boolean;
  explicit: boolean;
}

export interface ConfidenceResult {
  confidence: number;
  signals: Record<string, number>;
}

export function computeConfidence(trackA: TrackInfo, trackB: TrackInfo): ConfidenceResult {
  const normalizedTitleA = normalize(trackA.title);
  const normalizedTitleB = normalize(trackB.title);
  const normalizedArtistA = normalize(trackA.artist);
  const normalizedArtistB = normalize(trackB.artist);

  const titleSim = jaroWinkler(normalizedTitleA, normalizedTitleB);
  const artistSim = jaroWinkler(normalizedArtistA, normalizedArtistB);

  // ISRC match path
  if (trackA.isrc && trackB.isrc && trackA.isrc === trackB.isrc) {
    const titleArtistAvg = (titleSim + artistSim) / 2;
    const confidence = 0.95 + 0.05 * (titleArtistAvg >= 0.9 ? 1 : 0);
    return {
      confidence,
      signals: { isrc: 1, titleSim, artistSim },
    };
  }

  // Duration similarity: 1 - |dA - dB| / 3, clamped to [0, 1]
  const durationDiff = Math.abs(trackA.duration - trackB.duration);
  const durationSim = Math.max(0, 1 - durationDiff / 3);

  // Album similarity
  let albumSim = 0;
  if (trackA.album && trackB.album) {
    const normalizedAlbumA = normalize(trackA.album);
    const normalizedAlbumB = normalize(trackB.album);
    albumSim = jaroWinkler(normalizedAlbumA, normalizedAlbumB);
  }

  const confidence = Math.min(
    1,
    Math.max(0, 0.45 * titleSim + 0.3 * artistSim + 0.15 * durationSim + 0.1 * albumSim),
  );

  return {
    confidence,
    signals: { titleSim, artistSim, durationSim, albumSim },
  };
}
