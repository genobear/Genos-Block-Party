/**
 * Audio manifest types for manifest-based audio loading
 */

export interface TrackMetadata {
  /** Path relative to public/ directory */
  file: string;
  /** Display name for UI (e.g., "Party Starter") */
  name?: string;
  /** Artist credit */
  artist?: string;
  /** Genre tag for filtering/mood (e.g., "upbeat", "chill") */
  genre?: string;
  /** Beats per minute - for future beat-sync effects */
  bpm?: number;
  /** Loop point in seconds - for seamless looping */
  loopPoint?: number;
}

export interface SfxEntry {
  /** Path to audio file (if file-based) */
  file?: string;
  /** True if this SFX is generated via Web Audio */
  generated?: boolean;
}

export interface LevelMusicConfig {
  /** Which level numbers use this playlist */
  levels: number[];
  /** Tracks in this playlist */
  tracks: TrackMetadata[];
}

export interface AudioManifest {
  /** Schema version for future migrations */
  version: number;
  /** Sound effects catalog */
  sfx: Record<string, SfxEntry>;
  /** Music configuration */
  music: {
    /** Menu/title screen music */
    menu: TrackMetadata;
    /** Level-specific playlists */
    levels: LevelMusicConfig[];
  };
}
