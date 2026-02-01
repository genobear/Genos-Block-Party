import Phaser from 'phaser';
import { AUDIO } from '../config/Constants';
import type { AudioManifest, TrackMetadata } from '../types/AudioManifest';

interface AudioSettings {
  musicVolume: number;
  sfxVolume: number;
  muted: boolean;
  forceLevelMusic: boolean;
  forceTrackChangeOnTransition: boolean;
}

/**
 * Track info for the Music Player scene
 */
export interface TrackInfo {
  key: string;
  path: string;
  metadata: TrackMetadata;
  level: number | null; // null for menu music
}

/**
 * AudioManager - Singleton for managing all game audio
 *
 * Features:
 * - SFX playback with Web Audio (low latency)
 * - Level music streaming with HTML5 Audio (on-demand loading)
 * - Shuffled playlist per level with crossfade transitions
 * - Volume/mute controls persisted to localStorage
 * - Generated placeholder SFX for development
 */
export class AudioManager {
  private static instance: AudioManager | null = null;

  private scene: Phaser.Scene | null = null;
  private settings: AudioSettings;
  private manifest: AudioManifest | null = null;

  // Current music state
  private currentMusic: Phaser.Sound.BaseSound | null = null;
  private currentPlaylist: string[] = [];
  private currentTrackMetadata: TrackMetadata | null = null;
  private playlistIndex: number = 0;
  private currentLevelNumber: number = -1;
  private isTransitioning: boolean = false;

  // Track ALL active music sounds to prevent orphaned audio during interrupted crossfades
  private activeMusicSounds: Set<Phaser.Sound.BaseSound> = new Set();
  private transitionAbortController: AbortController | null = null;

  // User's selected station from Music Player (used when forceLevelMusic is false)
  private selectedStation: 'all' | number | null = 'all';  // 'all', level number, or null for menu

  // Track loaded music keys for cleanup
  private loadedMusicKeys: Set<string> = new Set();

  // Map audio keys to their metadata for quick lookup
  private trackMetadataMap: Map<string, TrackMetadata> = new Map();

  // Callbacks for track changes (multiple listeners supported)
  private onTrackChangeCallbacks: Set<(metadata: TrackMetadata | null) => void> = new Set();

  private constructor() {
    this.settings = this.loadSettings();
  }

  /**
   * Get the singleton instance
   */
  static getInstance(): AudioManager {
    if (!AudioManager.instance) {
      AudioManager.instance = new AudioManager();
    }
    return AudioManager.instance;
  }

  /**
   * Initialize the AudioManager with the current scene
   * Call this in scene.create() before using audio
   */
  init(scene: Phaser.Scene): void {
    this.scene = scene;

    // Apply current mute state to sound manager
    if (this.scene.sound) {
      this.scene.sound.mute = this.settings.muted;
    }
  }

  /**
   * Set the audio manifest (called from BootScene after loading)
   */
  setManifest(manifest: AudioManifest): void {
    this.manifest = manifest;

    // Build the metadata lookup map
    this.trackMetadataMap.clear();

    // Index level tracks by their generated key
    for (const levelConfig of manifest.music.levels) {
      for (const track of levelConfig.tracks) {
        // Generate a key from the file path
        const key = this.filePathToKey(track.file);
        this.trackMetadataMap.set(key, track);
      }
    }

    // Index menu music
    if (manifest.music.menu) {
      this.trackMetadataMap.set('menu-music', manifest.music.menu);
    }
  }

  /**
   * Convert a file path to an audio key
   * e.g., "audio/music/level1/track1.mp3" -> "level1-track1"
   */
  private filePathToKey(filePath: string): string {
    // Extract meaningful parts from path
    const match = filePath.match(/level(\d+)\/(.+)\.mp3$/);
    if (match) {
      const levelNum = match[1];
      const trackName = match[2];
      return `level${levelNum}-${trackName}`;
    }
    // Fallback: use filename without extension
    const filename = filePath.split('/').pop()?.replace('.mp3', '') || filePath;
    return filename;
  }

  /**
   * Check if manifest is loaded
   */
  hasManifest(): boolean {
    return this.manifest !== null;
  }

  /**
   * Load settings from localStorage
   */
  private loadSettings(): AudioSettings {
    try {
      const stored = localStorage.getItem(AUDIO.STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return {
          musicVolume: parsed.musicVolume ?? AUDIO.DEFAULT_MUSIC_VOLUME,
          sfxVolume: parsed.sfxVolume ?? AUDIO.DEFAULT_SFX_VOLUME,
          muted: parsed.muted ?? false,
          forceLevelMusic: parsed.forceLevelMusic ?? true,
          forceTrackChangeOnTransition: parsed.forceTrackChangeOnTransition ?? true,
        };
      }
    } catch {
      // Ignore parse errors
    }
    return {
      musicVolume: AUDIO.DEFAULT_MUSIC_VOLUME,
      sfxVolume: AUDIO.DEFAULT_SFX_VOLUME,
      muted: false,
      forceLevelMusic: true,
      forceTrackChangeOnTransition: true,
    };
  }

  /**
   * Save settings to localStorage
   */
  private saveSettings(): void {
    try {
      localStorage.setItem(AUDIO.STORAGE_KEY, JSON.stringify(this.settings));
    } catch {
      // Ignore storage errors
    }
  }

  // =====================
  // Volume & Mute Controls
  // =====================

  getMusicVolume(): number {
    return this.settings.musicVolume;
  }

  setMusicVolume(volume: number): void {
    this.settings.musicVolume = Math.max(0, Math.min(1, volume));
    this.saveSettings();

    // Update currently playing music
    if (this.currentMusic && 'volume' in this.currentMusic) {
      (this.currentMusic as Phaser.Sound.WebAudioSound).setVolume(this.settings.musicVolume);
    }
  }

  getSfxVolume(): number {
    return this.settings.sfxVolume;
  }

  setSfxVolume(volume: number): void {
    this.settings.sfxVolume = Math.max(0, Math.min(1, volume));
    this.saveSettings();
  }

  isMuted(): boolean {
    return this.settings.muted;
  }

  setMuted(muted: boolean): void {
    this.settings.muted = muted;
    this.saveSettings();

    if (this.scene?.sound) {
      this.scene.sound.mute = muted;
    }
  }

  toggleMute(): boolean {
    this.setMuted(!this.settings.muted);
    return this.settings.muted;
  }

  /**
   * Check if level theme music lock is enabled
   * When true, only plays songs from the current level during gameplay
   */
  isForceLevelMusic(): boolean {
    return this.settings.forceLevelMusic;
  }

  /**
   * Set the level theme music lock
   */
  setForceLevelMusic(force: boolean): void {
    this.settings.forceLevelMusic = force;

    // If turning OFF level lock, also turn OFF force track change (it depends on level lock)
    if (!force) {
      this.settings.forceTrackChangeOnTransition = false;
    }

    this.saveSettings();

    // Rebuild playlist based on new setting
    if (force && this.currentLevelNumber > 0) {
      // Switching to level lock ON - rebuild for current level
      this.rebuildPlaylistForStation();
    } else if (!force) {
      // Switching to level lock OFF - use selected station
      this.rebuildPlaylistForStation();
    }
  }

  /**
   * Check if force track change on transition is enabled
   * When true, automatically switches to a new track when entering a level or menu
   * Only available when forceLevelMusic is also enabled
   */
  isForceTrackChangeOnTransition(): boolean {
    return this.settings.forceTrackChangeOnTransition;
  }

  /**
   * Set force track change on transition
   * Can only be enabled if forceLevelMusic is also enabled
   */
  setForceTrackChangeOnTransition(force: boolean): void {
    // Can only enable if level lock is also enabled
    if (force && !this.settings.forceLevelMusic) {
      return;
    }
    this.settings.forceTrackChangeOnTransition = force;
    this.saveSettings();
  }

  /**
   * Get the user's selected station from Music Player
   */
  getSelectedStation(): 'all' | number | null {
    return this.selectedStation;
  }

  /**
   * Set the user's selected station (called from MusicPlayerScene)
   * Rebuilds playlist unless we're in a level with level theme lock ON
   */
  setSelectedStation(station: 'all' | number | null): void {
    this.selectedStation = station;

    // Rebuild playlist unless we're in a level with level theme lock ON
    // - In menu (currentLevelNumber <= 0): Always rebuild when station changes
    // - In level with lock OFF: Rebuild when station changes
    // - In level with lock ON: Don't rebuild (level tracks take priority)
    if (!this.settings.forceLevelMusic || this.currentLevelNumber <= 0) {
      this.rebuildPlaylistForStation();
    }
  }

  /**
   * Rebuild the playlist based on current settings
   * - If forceLevelMusic is ON: use current level tracks
   * - If forceLevelMusic is OFF: use selected station
   */
  private async rebuildPlaylistForStation(): Promise<void> {
    if (!this.scene) return;

    let tracks: { key: string; path: string; metadata: TrackMetadata }[];

    if (this.settings.forceLevelMusic && this.currentLevelNumber > 0) {
      // Level lock ON, in a level - use current level tracks only
      tracks = this.getTracksForLevel(this.currentLevelNumber);
    } else if (this.settings.forceLevelMusic && this.currentLevelNumber <= 0) {
      // Level lock ON, in menu - use menu music
      tracks = this.getMenuTracks();
    } else if (this.selectedStation === 'all') {
      // Level lock OFF - use all tracks
      tracks = this.getAllTracksForPlaylist();
    } else if (this.selectedStation === null) {
      // Level lock OFF, menu station selected - use menu music
      tracks = this.getMenuTracks();
    } else {
      // Level lock OFF, specific level selected - use that level's tracks
      tracks = this.getTracksForLevel(this.selectedStation);
    }

    if (tracks.length === 0) {
      return;
    }

    // Load tracks if needed
    for (const track of tracks) {
      if (!this.scene.cache.audio.exists(track.key)) {
        this.scene.load.audio(track.key, track.path);
      }
      this.trackMetadataMap.set(track.key, track.metadata);
    }

    const trackKeys = tracks.map(t => t.key);
    await this.loadTracks(trackKeys);

    // Update playlist with new tracks (shuffled)
    this.currentPlaylist = this.shuffleArray([...trackKeys]);
    this.playlistIndex = 0;

    // Track loaded keys
    trackKeys.forEach(key => this.loadedMusicKeys.add(key));
  }

  // =====================
  // SFX Playback
  // =====================

  /**
   * Play a sound effect by key
   * @param key - The SFX key (e.g., AUDIO.SFX.POP)
   */
  playSFX(key: string): void {
    if (!this.scene?.sound) return;

    // Check if the sound exists in cache
    if (!this.scene.cache.audio.exists(key)) {
      console.warn(`SFX not found: ${key}`);
      return;
    }

    this.scene.sound.play(key, { volume: this.settings.sfxVolume });
  }

  // =====================
  // Music Playback
  // =====================

  /**
   * Play a single track (for menu music, etc.)
   * Playlist provides looping - individual tracks never loop
   * @param key - The audio key
   */
  async playMusic(key: string): Promise<void> {
    if (!this.scene?.sound) return;

    // Check if already playing this track
    if (this.currentMusic?.key === key && (this.currentMusic as Phaser.Sound.BaseSound).isPlaying) {
      return;
    }

    // Ensure playlist exists so complete handler can loop
    // If no playlist set up, create minimal playlist with just this track
    if (this.currentPlaylist.length === 0) {
      this.currentPlaylist = [key];
      this.playlistIndex = 0;
    }

    // Crossfade to new track
    await this.crossfadeTo(key);
  }

  /**
   * Stop current music with optional fade out
   */
  async stopMusic(fadeOut: boolean = true): Promise<void> {
    if (!this.currentMusic || !this.scene) return;

    if (fadeOut) {
      await this.fadeOut(this.currentMusic, AUDIO.CROSSFADE_DURATION);
    }

    this.destroyMusicSound(this.currentMusic);
    this.currentMusic = null;
  }

  /**
   * Stop ALL active music sounds immediately (no fade)
   * Use this to guarantee a clean state - prevents orphaned audio from interrupted crossfades
   */
  stopAllMusic(): void {
    // Abort any in-progress transition
    if (this.transitionAbortController) {
      this.transitionAbortController.abort();
      this.transitionAbortController = null;
    }

    // Stop and destroy EVERY tracked sound
    this.activeMusicSounds.forEach(sound => {
      try {
        sound.stop();
        sound.destroy();
      } catch {
        // Sound may already be destroyed
      }
    });
    this.activeMusicSounds.clear();

    // Reset state
    this.currentMusic = null;
    this.currentTrackMetadata = null;
    this.isTransitioning = false;
  }

  /**
   * Safely destroy a music sound and remove from tracking
   */
  private destroyMusicSound(sound: Phaser.Sound.BaseSound | null): void {
    if (!sound) return;
    this.activeMusicSounds.delete(sound);
    try {
      sound.stop();
      sound.destroy();
    } catch {
      // Sound may already be destroyed
    }
  }

  /**
   * Fade out current music with configurable duration
   * Use for graceful endings (game over, win) with longer fades
   */
  async fadeOutMusic(duration?: number): Promise<void> {
    if (!this.currentMusic || !this.scene) return;

    const fadeDuration = duration ?? AUDIO.CROSSFADE_DURATION;
    await this.fadeOut(this.currentMusic, fadeDuration);
    this.currentMusic.destroy();
    this.currentMusic = null;
  }

  /**
   * Load and start playing music for a specific level
   * Implements shuffled playlist with seamless crossfade from any current music
   * When forceLevelMusic is false, loads ALL tracks into the playlist
   */
  async loadLevelMusic(levelNumber: number): Promise<void> {
    if (!this.scene) return;

    // Don't reload if same level and already playing
    if (levelNumber === this.currentLevelNumber && this.currentPlaylist.length > 0) {
      return;
    }

    // Track old keys for cleanup AFTER crossfade (deferred unloading)
    const oldKeys = new Set(this.loadedMusicKeys);
    const oldLevelNumber = this.currentLevelNumber;

    // Update state for new level
    this.currentLevelNumber = levelNumber;

    // Get tracks based on forceLevelMusic setting
    let tracks: { key: string; path: string; metadata: TrackMetadata }[];

    if (this.settings.forceLevelMusic) {
      // Only load tracks for this specific level
      tracks = this.getTracksForLevel(levelNumber);
    } else {
      // Load ALL tracks from all levels (free play mode)
      tracks = this.getAllTracksForPlaylist();
    }

    if (tracks.length === 0) {
      console.warn(`No music found for level ${levelNumber}`);
      return;
    }

    // Queue tracks for loading
    for (const track of tracks) {
      if (!this.scene.cache.audio.exists(track.key)) {
        this.scene.load.audio(track.key, track.path);
      }
      // Store metadata mapping
      this.trackMetadataMap.set(track.key, track.metadata);
    }

    // Load the tracks
    const trackKeys = tracks.map(t => t.key);
    await this.loadTracks(trackKeys);

    // Update playlist and reset index
    this.currentPlaylist = this.shuffleArray([...trackKeys]);
    this.playlistIndex = 0;

    // Decide whether to force a track change:
    // - If forceTrackChangeOnTransition is ON, switch to a new track ONLY if current track is not in new playlist
    // - If OFF, keep current track playing; when it ends, complete handler plays from updated playlist
    if (this.settings.forceTrackChangeOnTransition) {
      const currentKey = this.currentMusic?.key;
      // Only force track change if current track is NOT in the new playlist
      if (!currentKey || !this.currentPlaylist.includes(currentKey)) {
        await this.playNextTrack();
      }
    }
    // Note: If keeping current track, its existing complete handler will use the updated playlist
    // since it references this.currentPlaylist (which we just updated above)

    // NOW clean up old level's cache (after crossfade complete)
    // Only cleanup when forceLevelMusic is true (otherwise we want to keep all tracks)
    if (this.settings.forceLevelMusic && oldLevelNumber !== -1 && oldLevelNumber !== levelNumber) {
      this.cleanupOldTracks(oldKeys);
    }
  }

  /**
   * Get all tracks from all levels for free play mode
   */
  private getAllTracksForPlaylist(): { key: string; path: string; metadata: TrackMetadata }[] {
    if (!this.manifest) return [];

    const tracks: { key: string; path: string; metadata: TrackMetadata }[] = [];

    for (const levelConfig of this.manifest.music.levels) {
      for (const track of levelConfig.tracks) {
        const key = this.filePathToKey(track.file);
        tracks.push({
          key,
          path: track.file,
          metadata: track,
        });
      }
    }

    return tracks;
  }

  /**
   * Clean up old track cache after crossfade completes
   * Preserves tracks that are shared between levels
   */
  private cleanupOldTracks(oldKeys: Set<string>): void {
    oldKeys.forEach(key => {
      // Don't remove if it's in the current playlist (shared tracks between levels)
      if (!this.currentPlaylist.includes(key) && this.scene?.cache.audio.exists(key)) {
        this.scene.cache.audio.remove(key);
        this.loadedMusicKeys.delete(key);
      }
    });
  }

  /**
   * Get tracks for a level from the manifest
   */
  private getTracksForLevel(levelNumber: number): { key: string; path: string; metadata: TrackMetadata }[] {
    if (!this.manifest) {
      console.warn('No audio manifest loaded');
      return [];
    }

    // Find the level config that includes this level number
    const levelConfig = this.manifest.music.levels.find(
      config => config.levels.includes(levelNumber)
    );

    if (!levelConfig) {
      console.warn(`No music configured for level ${levelNumber}`);
      return [];
    }

    // Map tracks to keys and paths
    return levelConfig.tracks.map(track => ({
      key: this.filePathToKey(track.file),
      path: track.file,
      metadata: track,
    }));
  }

  /**
   * Get menu music tracks
   */
  private getMenuTracks(): { key: string; path: string; metadata: TrackMetadata }[] {
    if (!this.manifest?.music.menu) return [];
    return [{
      key: 'menu-music',
      path: this.manifest.music.menu.file,
      metadata: this.manifest.music.menu,
    }];
  }

  /**
   * Get all level numbers that have music configured
   */
  getAvailableLevelsWithMusic(): number[] {
    if (!this.manifest) return [];

    const levels = new Set<number>();
    for (const config of this.manifest.music.levels) {
      for (const level of config.levels) {
        levels.add(level);
      }
    }
    return Array.from(levels).sort((a, b) => a - b);
  }

  /**
   * Get all tracks from the manifest (for Music Player scene)
   */
  getAllTracks(): TrackInfo[] {
    if (!this.manifest) return [];

    const tracks: TrackInfo[] = [];

    // Add menu track
    if (this.manifest.music.menu) {
      tracks.push({
        key: 'menu-music',
        path: this.manifest.music.menu.file,
        metadata: this.manifest.music.menu,
        level: null,
      });
    }

    // Add all level tracks
    for (const levelConfig of this.manifest.music.levels) {
      const levelNum = levelConfig.levels[0]; // Primary level number
      for (const track of levelConfig.tracks) {
        const key = this.filePathToKey(track.file);
        tracks.push({
          key,
          path: track.file,
          metadata: track,
          level: levelNum,
        });
      }
    }

    return tracks;
  }

  /**
   * Get the audio key of the currently playing track
   */
  getCurrentTrackKey(): string | null {
    return this.currentMusic?.key ?? null;
  }

  /**
   * Play a specific track by key (for Music Player manual selection)
   * Loads the track if not already in cache
   * After this track completes, will resume normal playlist behavior
   */
  async playTrackByKey(trackInfo: TrackInfo): Promise<void> {
    if (!this.scene) return;

    // Guard against double-clicks or rapid selections during transition
    if (this.isTransitioning) return;

    // Guard against selecting the already-playing track
    if (this.currentMusic?.key === trackInfo.key && (this.currentMusic as Phaser.Sound.BaseSound).isPlaying) {
      return;
    }

    // Load if not in cache
    if (!this.scene.cache.audio.exists(trackInfo.key)) {
      this.scene.load.audio(trackInfo.key, trackInfo.path);
      await this.loadTracks([trackInfo.key]);
    }

    // Store metadata mapping
    this.trackMetadataMap.set(trackInfo.key, trackInfo.metadata);

    // Crossfade to the selected track (complete handler set up in crossfadeTo)
    await this.crossfadeTo(trackInfo.key);
  }

  /**
   * Load audio tracks
   */
  private loadTracks(keys: string[]): Promise<void> {
    return new Promise((resolve) => {
      if (!this.scene) {
        resolve();
        return;
      }

      // Check if all tracks are already loaded
      const allLoaded = keys.every(key => this.scene!.cache.audio.exists(key));
      if (allLoaded) {
        resolve();
        return;
      }

      // Wait for loading to complete
      this.scene.load.once('complete', () => {
        // Track which keys were successfully loaded
        keys.forEach(key => {
          if (this.scene!.cache.audio.exists(key)) {
            this.loadedMusicKeys.add(key);
          }
        });
        resolve();
      });

      this.scene.load.once('loaderror', (file: Phaser.Loader.File) => {
        // Remove failed tracks from playlist
        const index = this.currentPlaylist.indexOf(file.key);
        if (index > -1) {
          this.currentPlaylist.splice(index, 1);
        }
      });

      this.scene.load.start();
    });
  }

  /**
   * Play the next track in the playlist
   */
  private async playNextTrack(): Promise<void> {
    if (this.currentPlaylist.length === 0 || !this.scene) return;

    // Filter playlist to only include successfully loaded tracks
    const availableTracks = this.currentPlaylist.filter(key =>
      this.scene!.cache.audio.exists(key)
    );

    if (availableTracks.length === 0) {
      console.warn('No playable tracks in playlist');
      return;
    }

    // Get next track (wrap around)
    const nextKey = availableTracks[this.playlistIndex % availableTracks.length];
    this.playlistIndex = (this.playlistIndex + 1) % availableTracks.length;

    // Crossfade to the next track (complete handler set up in crossfadeTo)
    await this.crossfadeTo(nextKey);
  }

  /**
   * Crossfade from current track to a new track
   * Interruption-safe: can be called while another crossfade is in progress
   * Never loops individual tracks - playlist provides continuous playback
   */
  private async crossfadeTo(key: string): Promise<void> {
    if (!this.scene?.sound) return;

    // Check if audio exists
    if (!this.scene.cache.audio.exists(key)) {
      console.warn(`Audio not found for crossfade: ${key}`);
      return;
    }

    // Abort any in-progress transition - this is the key fix for overlapping audio
    if (this.transitionAbortController) {
      this.transitionAbortController.abort();
    }

    // Capture old track before we do anything
    const oldTrack = this.currentMusic;

    // Create abort controller for THIS transition
    this.transitionAbortController = new AbortController();
    const signal = this.transitionAbortController.signal;

    this.isTransitioning = true;

    // Create the new track at volume 0 (never loop - playlist handles continuity)
    const newTrack = this.scene.sound.add(key, {
      volume: 0,
      loop: false,
    });

    // Track the new sound IMMEDIATELY - prevents orphaned audio
    this.activeMusicSounds.add(newTrack);

    // Start playing new track
    newTrack.play();

    try {
      // Fade out old track (if exists) and fade in new track simultaneously
      await Promise.all([
        oldTrack
          ? this.fadeOutWithAbort(oldTrack, AUDIO.CROSSFADE_DURATION, signal)
          : Promise.resolve(),
        this.fadeInWithAbort(newTrack, AUDIO.CROSSFADE_DURATION, signal),
      ]);

      // Only proceed if not aborted
      if (!signal.aborted) {
        // Clean up old track
        if (oldTrack) {
          this.destroyMusicSound(oldTrack);
        }

        this.currentMusic = newTrack;
        this.currentTrackMetadata = this.trackMetadataMap.get(key) || null;

        // Notify all track change listeners
        if (this.currentTrackMetadata) {
          this.onTrackChangeCallbacks.forEach(callback => callback(this.currentTrackMetadata));
        }

        // Set up complete handler to play next from playlist
        this.currentMusic.once('complete', () => {
          if (!this.isTransitioning && this.currentPlaylist.length > 0) {
            this.playNextTrack();
          }
        });
      }
    } catch {
      // Transition was aborted or failed
      // Clean up the new track if it's orphaned (not the current track)
      if (signal.aborted && this.currentMusic !== newTrack) {
        this.destroyMusicSound(newTrack);
      }
    } finally {
      // Only reset state if THIS transition wasn't aborted
      // (if aborted, the NEW transition owns the state now)
      if (!signal.aborted) {
        this.isTransitioning = false;
        this.transitionAbortController = null;
      }
    }
  }

  /**
   * Fade out a sound (used for stopMusic and fadeOutMusic)
   */
  private fadeOut(sound: Phaser.Sound.BaseSound, duration: number): Promise<void> {
    return new Promise((resolve) => {
      if (!this.scene?.tweens) {
        // Scene or tweens not available - resolve immediately
        resolve();
        return;
      }

      this.scene.tweens.add({
        targets: sound,
        volume: 0,
        duration,
        onComplete: () => resolve(),
      });
    });
  }

  /**
   * Fade in a sound with abort support
   * Rejects if aborted, allowing cleanup
   */
  private fadeInWithAbort(
    sound: Phaser.Sound.BaseSound,
    duration: number,
    signal: AbortSignal
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.scene?.tweens) {
        resolve();
        return;
      }

      // Already aborted before we started
      if (signal.aborted) {
        reject(new Error('Fade aborted'));
        return;
      }

      const tween = this.scene.tweens.add({
        targets: sound,
        volume: this.settings.musicVolume,
        duration,
        onComplete: () => {
          signal.removeEventListener('abort', abortHandler);
          resolve();
        },
      });

      const abortHandler = () => {
        tween.stop();
        reject(new Error('Fade aborted'));
      };
      signal.addEventListener('abort', abortHandler);
    });
  }

  /**
   * Fade out a sound with abort support
   * Rejects if aborted, allowing cleanup
   */
  private fadeOutWithAbort(
    sound: Phaser.Sound.BaseSound,
    duration: number,
    signal: AbortSignal
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.scene?.tweens) {
        resolve();
        return;
      }

      // Already aborted before we started
      if (signal.aborted) {
        reject(new Error('Fade aborted'));
        return;
      }

      const tween = this.scene.tweens.add({
        targets: sound,
        volume: 0,
        duration,
        onComplete: () => {
          signal.removeEventListener('abort', abortHandler);
          resolve();
        },
      });

      const abortHandler = () => {
        tween.stop();
        reject(new Error('Fade aborted'));
      };
      signal.addEventListener('abort', abortHandler);
    });
  }

  /**
   * Unload current level's music to free memory
   */
  unloadLevelMusic(): void {
    // Stop all tracked music sounds (includes current and any orphaned sounds)
    this.stopAllMusic();

    // Remove loaded music from cache
    this.loadedMusicKeys.forEach(key => {
      if (this.scene?.cache.audio.exists(key)) {
        this.scene.cache.audio.remove(key);
      }
    });

    this.loadedMusicKeys.clear();
    this.currentPlaylist = [];
    this.playlistIndex = 0;
  }

  /**
   * Preload music for the next level (background loading)
   */
  preloadLevelMusic(levelNumber: number): void {
    if (!this.scene) return;

    // Get tracks from manifest
    const tracks = this.getTracksForLevel(levelNumber);

    if (tracks.length === 0) {
      return; // No tracks for this level
    }

    // Silently preload tracks in background
    for (const track of tracks) {
      if (!this.scene.cache.audio.exists(track.key)) {
        this.scene.load.audio(track.key, track.path);
      }
      // Store metadata mapping
      this.trackMetadataMap.set(track.key, track.metadata);
    }

    // Start loading without waiting
    this.scene.load.start();
  }

  // =====================
  // Utilities
  // =====================

  /**
   * Fisher-Yates shuffle algorithm
   */
  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  /**
   * Pause music (for pause menu)
   */
  pauseMusic(): void {
    if (this.currentMusic && (this.currentMusic as Phaser.Sound.BaseSound).isPlaying) {
      this.currentMusic.pause();
    }
  }

  /**
   * Resume music (after pause menu)
   */
  resumeMusic(): void {
    if (this.currentMusic && (this.currentMusic as Phaser.Sound.BaseSound).isPaused) {
      this.currentMusic.resume();
    }
  }

  /**
   * Check if music is currently playing
   */
  isMusicPlaying(): boolean {
    return (this.currentMusic as Phaser.Sound.BaseSound)?.isPlaying ?? false;
  }

  /**
   * Skip to the next track in the playlist
   */
  async skipToNextTrack(): Promise<void> {
    if (this.currentPlaylist.length === 0) return;
    await this.playNextTrack();
  }

  /**
   * Skip to the previous track in the playlist
   */
  async skipToPreviousTrack(): Promise<void> {
    if (this.currentPlaylist.length === 0) return;

    // Go back 2 positions (playNextTrack increments by 1)
    const len = this.currentPlaylist.length;
    this.playlistIndex = (this.playlistIndex - 2 + len) % len;
    await this.playNextTrack();
  }

  /**
   * Restart current track from beginning and pause
   */
  restartAndPause(): void {
    if (this.currentMusic) {
      const sound = this.currentMusic as Phaser.Sound.WebAudioSound;
      // Seek to beginning (setSeek returns the sound for chaining)
      sound.setSeek(0);
      // Pause
      sound.pause();
    }
  }

  // =====================
  // Metadata Accessors
  // =====================

  /**
   * Get the full metadata for the currently playing track
   */
  getCurrentTrackMetadata(): TrackMetadata | null {
    return this.currentTrackMetadata;
  }

  /**
   * Get the display name of the currently playing track
   */
  getCurrentTrackName(): string | null {
    return this.currentTrackMetadata?.name || null;
  }

  /**
   * Get the artist of the currently playing track
   */
  getCurrentTrackArtist(): string | null {
    return this.currentTrackMetadata?.artist || null;
  }

  /**
   * Get the genre of the currently playing track
   */
  getCurrentTrackGenre(): string | null {
    return this.currentTrackMetadata?.genre || null;
  }

  /**
   * Get metadata for a specific track by key
   */
  getTrackMetadata(key: string): TrackMetadata | null {
    return this.trackMetadataMap.get(key) || null;
  }

  /**
   * Register a callback for track changes (used by NowPlayingToast, PauseScene, etc.)
   * The callback is invoked whenever a new track starts playing.
   * @returns A cleanup function to remove the listener
   */
  onTrackChange(callback: (metadata: TrackMetadata | null) => void): () => void {
    this.onTrackChangeCallbacks.add(callback);
    return () => {
      this.onTrackChangeCallbacks.delete(callback);
    };
  }

  /**
   * Handle returning to menu - rebuilds playlist based on level lock setting
   * When level lock is ON, switches to menu music playlist
   * When level lock is OFF, continues with current playlist behavior
   */
  async handleReturnToMenu(): Promise<void> {
    // Abort any in-progress transition to prevent orphaned audio
    if (this.transitionAbortController) {
      this.transitionAbortController.abort();
      this.transitionAbortController = null;
      this.isTransitioning = false;
    }

    const wasInLevel = this.currentLevelNumber > 0;
    this.currentLevelNumber = -1;

    // If level lock is ON and we were in a level, rebuild playlist for menu
    if (this.settings.forceLevelMusic && wasInLevel) {
      await this.rebuildPlaylistForStation();

      // Only force track change if that setting is also ON
      if (this.settings.forceTrackChangeOnTransition && this.currentPlaylist.length > 0) {
        await this.playNextTrack();
      }
      // Note: If keeping current track, its existing complete handler will use the updated playlist
    }
    // If level lock is OFF, playlist is already based on selected station, no change needed
  }

  /**
   * Clear level tracking state without stopping music
   * Use when transitioning scenes but wanting seamless music crossfade
   */
  clearLevelState(): void {
    this.currentLevelNumber = -1;
    this.currentPlaylist = [];
    this.playlistIndex = 0;
    // Note: Don't clear loadedMusicKeys - the new scene will clean up after crossfade
  }

  /**
   * Reset audio state for scene transitions (preserves singleton)
   * Use this when restarting game or returning to menu
   * Note: For seamless transitions, prefer clearLevelState() + let new scene handle music
   */
  reset(): void {
    this.stopAllMusic();
    this.unloadLevelMusic();
    this.currentLevelNumber = -1;
  }

  /**
   * Clean up when game ends completely
   * Note: Generally prefer reset() for scene transitions
   */
  destroy(): void {
    this.stopAllMusic();
    this.unloadLevelMusic();
    this.currentLevelNumber = -1;
  }
}
