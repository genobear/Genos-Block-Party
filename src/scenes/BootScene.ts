import Phaser from 'phaser';
import { COLORS, PADDLE_WIDTH, PADDLE_HEIGHT, BALL_RADIUS, BRICK_WIDTH, BRICK_HEIGHT, PLAYABLE_WIDTH, AUDIO } from '../config/Constants';
import { PowerUpType, POWERUP_CONFIGS } from '../types/PowerUpTypes';
import { AudioManager } from '../systems/AudioManager';
import { LoadingOverlay } from '../utils/LoadingOverlay';
import type { AudioManifest } from '../types/AudioManifest';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload(): void {
    // Use HTML loading overlay instead of Phaser graphics
    const loadingOverlay = LoadingOverlay.getInstance();

    // Update overlay text during load progress
    this.load.on('progress', (value: number) => {
      const percent = Math.round(value * 100);
      loadingOverlay.setLoadingText(`Loading... ${percent}%`);
    });

    this.load.on('complete', () => {
      loadingOverlay.setLoadingText('Preparing...');
    });

    // Load audio manifest first
    this.load.json('audio-manifest', 'audio/manifest.json');

    // Generate placeholder graphics
    this.createPlaceholderGraphics();

    // Generate placeholder SFX (can be replaced with real audio files later)
    this.generatePlaceholderSFX();

    // Menu music will be loaded after manifest is parsed in create()
  }

  create(): void {
    // Get the audio manifest and pass to AudioManager
    const manifest = this.cache.json.get('audio-manifest') as AudioManifest | undefined;

    if (manifest) {
      AudioManager.getInstance().setManifest(manifest);

      // Load menu music from manifest
      const menuMusicPath = manifest.music.menu.file;
      this.load.audio('menu-music', menuMusicPath);

      // Wait for menu music to load, then transition
      this.load.once('complete', () => {
        // Launch MusicScene (runs forever in background for audio)
        this.scene.launch('MusicScene');
        this.scene.start('MenuScene');
      });

      this.load.start();
    } else {
      console.warn('Audio manifest not found, proceeding without music');
      // Launch MusicScene (runs forever in background for audio)
      this.scene.launch('MusicScene');
      this.scene.start('MenuScene');
    }
  }

  private createPlaceholderGraphics(): void {
    // Create paddle texture (DJ deck style)
    const paddleGraphics = this.make.graphics({ x: 0, y: 0 });
    paddleGraphics.fillStyle(COLORS.PADDLE);
    paddleGraphics.fillRoundedRect(0, 0, PADDLE_WIDTH, PADDLE_HEIGHT, 8);
    // Add accent lines for DJ deck look
    paddleGraphics.fillStyle(COLORS.PADDLE_ACCENT);
    paddleGraphics.fillCircle(20, PADDLE_HEIGHT / 2, 6);
    paddleGraphics.fillCircle(PADDLE_WIDTH - 20, PADDLE_HEIGHT / 2, 6);
    paddleGraphics.generateTexture('paddle', PADDLE_WIDTH, PADDLE_HEIGHT);
    paddleGraphics.destroy();

    // Create ball texture
    const ballGraphics = this.make.graphics({ x: 0, y: 0 });
    ballGraphics.fillStyle(COLORS.BALL);
    ballGraphics.fillCircle(BALL_RADIUS, BALL_RADIUS, BALL_RADIUS);
    ballGraphics.generateTexture('ball', BALL_RADIUS * 2, BALL_RADIUS * 2);
    ballGraphics.destroy();

    // Create brick textures for each type and health level
    this.createBrickTextures();

    // Create power-up textures
    this.createPowerUpTextures();

    // Create particle textures
    this.createParticleTextures();

    // Create safety net texture (Bounce House power-up)
    this.createSafetyNetTexture();
  }

  private createBrickTextures(): void {
    const types = [
      { name: 'present', color: COLORS.PRESENT },
      { name: 'pinata', color: COLORS.PINATA },
      { name: 'balloon', color: COLORS.BALLOON },
    ];

    types.forEach(({ name, color }) => {
      for (let health = 1; health <= 3; health++) {
        const g = this.make.graphics({ x: 0, y: 0 });

        // Opacity based on health (3 = full, 1 = faded)
        const alpha = 0.4 + (health / 3) * 0.6;

        // Main brick body
        g.fillStyle(color, alpha);
        g.fillRoundedRect(2, 2, BRICK_WIDTH - 4, BRICK_HEIGHT - 4, 4);

        // Border
        g.lineStyle(2, 0xffffff, alpha * 0.5);
        g.strokeRoundedRect(2, 2, BRICK_WIDTH - 4, BRICK_HEIGHT - 4, 4);

        // Health indicator dots
        g.fillStyle(0xffffff, alpha);
        const dotY = BRICK_HEIGHT - 6;
        const dotStartX = (BRICK_WIDTH - (health * 8)) / 2;
        for (let i = 0; i < health; i++) {
          g.fillCircle(dotStartX + 4 + i * 8, dotY, 2);
        }

        g.generateTexture(`brick-${name}-${health}`, BRICK_WIDTH, BRICK_HEIGHT);
        g.destroy();
      }
    });
  }

  private createPowerUpTextures(): void {
    const powerUps = [
      { name: 'balloon', color: POWERUP_CONFIGS[PowerUpType.BALLOON].color, symbol: 'B' },
      { name: 'cake', color: POWERUP_CONFIGS[PowerUpType.CAKE].color, symbol: 'C' },
      { name: 'drinks', color: POWERUP_CONFIGS[PowerUpType.DRINKS].color, symbol: 'D' },
      { name: 'disco', color: POWERUP_CONFIGS[PowerUpType.DISCO].color, symbol: 'M' },
      { name: 'mystery', color: POWERUP_CONFIGS[PowerUpType.MYSTERY].color, symbol: '?' },
      { name: 'powerball', color: POWERUP_CONFIGS[PowerUpType.POWERBALL].color, symbol: 'P' },
      { name: 'fireball', color: POWERUP_CONFIGS[PowerUpType.FIREBALL].color, symbol: 'F' },
      { name: 'electricball', color: POWERUP_CONFIGS[PowerUpType.ELECTRICBALL].color, symbol: 'Z' },
      { name: 'bouncehouse', color: POWERUP_CONFIGS[PowerUpType.BOUNCE_HOUSE].color, symbol: 'N' },
      { name: 'partyfavor', color: POWERUP_CONFIGS[PowerUpType.PARTY_FAVOR].color, symbol: '+' },
    ];

    const size = 24;

    powerUps.forEach(({ name, color }) => {
      const g = this.make.graphics({ x: 0, y: 0 });

      // Circle background
      g.fillStyle(color);
      g.fillCircle(size / 2, size / 2, size / 2 - 1);

      // Border
      g.lineStyle(2, 0xffffff, 0.8);
      g.strokeCircle(size / 2, size / 2, size / 2 - 1);

      g.generateTexture(`powerup-${name}`, size, size);
      g.destroy();
    });
  }

  private createParticleTextures(): void {
    // Confetti particle (small rectangle)
    const confetti = this.make.graphics({ x: 0, y: 0 });
    confetti.fillStyle(0xffffff);
    confetti.fillRect(0, 0, 8, 4);
    confetti.generateTexture('particle-confetti', 8, 4);
    confetti.destroy();

    // Streamer particle (longer rectangle)
    const streamer = this.make.graphics({ x: 0, y: 0 });
    streamer.fillStyle(0xffffff);
    streamer.fillRect(0, 0, 4, 16);
    streamer.generateTexture('particle-streamer', 4, 16);
    streamer.destroy();

    // Sparkle particle (star-like diamond)
    const sparkle = this.make.graphics({ x: 0, y: 0 });
    sparkle.fillStyle(0xffffff);
    sparkle.beginPath();
    sparkle.moveTo(6, 0);
    sparkle.lineTo(8, 4);
    sparkle.lineTo(12, 6);
    sparkle.lineTo(8, 8);
    sparkle.lineTo(6, 12);
    sparkle.lineTo(4, 8);
    sparkle.lineTo(0, 6);
    sparkle.lineTo(4, 4);
    sparkle.closePath();
    sparkle.fillPath();
    sparkle.generateTexture('particle-sparkle', 12, 12);
    sparkle.destroy();

    // Spark particle (small circle for danger trail)
    const spark = this.make.graphics({ x: 0, y: 0 });
    spark.fillStyle(0xffffff);
    spark.fillCircle(4, 4, 4);
    spark.generateTexture('particle-spark', 8, 8);
    spark.destroy();

    // Flame particle (larger soft circle for fireball trail)
    const flame = this.make.graphics({ x: 0, y: 0 });
    flame.fillStyle(0xffffff);
    flame.fillCircle(6, 6, 6);
    flame.generateTexture('particle-flame', 12, 12);
    flame.destroy();

    // Mirror facet particle (small diamond for mirror ball reflections)
    const mirrorFacet = this.make.graphics({ x: 0, y: 0 });
    mirrorFacet.fillStyle(0xffffff);
    mirrorFacet.beginPath();
    mirrorFacet.moveTo(4, 0);
    mirrorFacet.lineTo(8, 4);
    mirrorFacet.lineTo(4, 8);
    mirrorFacet.lineTo(0, 4);
    mirrorFacet.closePath();
    mirrorFacet.fillPath();
    mirrorFacet.generateTexture('particle-mirror-facet', 8, 8);
    mirrorFacet.destroy();

    // Light ray particle (elongated beam for mirror ball light reflections)
    const lightRay = this.make.graphics({ x: 0, y: 0 });
    lightRay.fillStyle(0xffffff);
    lightRay.beginPath();
    lightRay.moveTo(2, 0);
    lightRay.lineTo(4, 0);
    lightRay.lineTo(4, 20);
    lightRay.lineTo(2, 20);
    lightRay.closePath();
    lightRay.fillPath();
    // Add tapered glow at top
    lightRay.fillStyle(0xffffff, 0.6);
    lightRay.fillCircle(3, 2, 3);
    lightRay.generateTexture('particle-light-ray', 6, 20);
    lightRay.destroy();

    // Glint particle (4-point star for light refractions)
    const glint = this.make.graphics({ x: 0, y: 0 });
    glint.fillStyle(0xffffff);
    glint.beginPath();
    // Vertical spike
    glint.moveTo(5, 0);
    glint.lineTo(6, 4);
    glint.lineTo(5, 10);
    glint.lineTo(4, 4);
    glint.closePath();
    glint.fillPath();
    // Horizontal spike
    glint.beginPath();
    glint.moveTo(0, 5);
    glint.lineTo(4, 4);
    glint.lineTo(10, 5);
    glint.lineTo(4, 6);
    glint.closePath();
    glint.fillPath();
    glint.generateTexture('particle-glint', 10, 10);
    glint.destroy();

    // Speed line particle (elongated tapered streak for fast ball trail)
    const speedline = this.make.graphics({ x: 0, y: 0 });
    speedline.fillStyle(0xffffff);
    speedline.fillRect(0, 5, 2, 2);  // Core (brightest)
    speedline.fillStyle(0xffffff, 0.7);
    speedline.fillRect(0, 3, 2, 2);  // Upper fade
    speedline.fillRect(0, 7, 2, 2);  // Lower fade
    speedline.fillStyle(0xffffff, 0.3);
    speedline.fillRect(0, 0, 2, 3);  // Top tip
    speedline.fillRect(0, 9, 2, 3);  // Bottom tip
    speedline.generateTexture('particle-speedline', 2, 12);
    speedline.destroy();

    // Electric particle (small lightning bolt fragment for energy crackle)
    const electric = this.make.graphics({ x: 0, y: 0 });
    electric.fillStyle(0xffffff);
    electric.fillRect(2, 0, 2, 2);
    electric.fillRect(1, 2, 2, 2);
    electric.fillRect(3, 4, 2, 2);
    electric.generateTexture('particle-electric', 6, 6);
    electric.destroy();

    // Glow particle (soft radial gradient circle for balloon trail bubbles)
    const glow = this.make.graphics({ x: 0, y: 0 });
    // Create layered circles with decreasing alpha for soft glow effect
    glow.fillStyle(0xffffff, 0.15);
    glow.fillCircle(8, 8, 8);
    glow.fillStyle(0xffffff, 0.3);
    glow.fillCircle(8, 8, 6);
    glow.fillStyle(0xffffff, 0.5);
    glow.fillCircle(8, 8, 4);
    glow.fillStyle(0xffffff, 0.8);
    glow.fillCircle(8, 8, 2);
    glow.generateTexture('particle-glow', 16, 16);
    glow.destroy();
  }

  /**
   * Create safety net texture (wide green bar for Bounce House power-up)
   */
  private createSafetyNetTexture(): void {
    const netWidth = PLAYABLE_WIDTH;
    const netHeight = 10;
    const g = this.make.graphics({ x: 0, y: 0 });

    // Glowing green bar
    g.fillStyle(0x90ee90, 0.9);
    g.fillRoundedRect(0, 0, netWidth, netHeight, 4);

    // White border for visibility
    g.lineStyle(1, 0xffffff, 0.5);
    g.strokeRoundedRect(0, 0, netWidth, netHeight, 4);

    // Center dot pattern for visual texture
    g.fillStyle(0xffffff, 0.3);
    for (let i = 20; i < netWidth; i += 40) {
      g.fillCircle(i, netHeight / 2, 2);
    }

    g.generateTexture('safety-net', netWidth, netHeight);
    g.destroy();
  }

  /**
   * Generate placeholder SFX using Web Audio synthesis
   * These can be replaced with real audio files later
   */
  private generatePlaceholderSFX(): void {
    const audioContext = new (window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();

    // Helper to create and cache audio buffer
    const createSound = (key: string, generator: (ctx: AudioContext) => AudioBuffer) => {
      const buffer = generator(audioContext);
      // Convert AudioBuffer to base64 WAV for Phaser
      const wavData = this.audioBufferToWav(buffer);
      const blob = new Blob([wavData], { type: 'audio/wav' });
      const url = URL.createObjectURL(blob);

      // Load into Phaser's audio cache
      this.load.audio(key, url);
    };

    // Pop sound - soft bubble pop for brick hit
    createSound(AUDIO.SFX.POP, (ctx) => {
      const duration = 0.08;
      const buffer = ctx.createBuffer(1, ctx.sampleRate * duration, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) {
        const t = i / ctx.sampleRate;
        const envelope = Math.exp(-t * 40);
        data[i] = Math.sin(2 * Math.PI * 400 * t) * envelope * 0.3;
      }
      return buffer;
    });

    // Horn sound - party horn for brick destroy
    createSound(AUDIO.SFX.HORN, (ctx) => {
      const duration = 0.3;
      const buffer = ctx.createBuffer(1, ctx.sampleRate * duration, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) {
        const t = i / ctx.sampleRate;
        const envelope = Math.exp(-t * 5);
        const freq = 523 + Math.sin(t * 10) * 50; // C5 with wobble
        data[i] = (Math.sin(2 * Math.PI * freq * t) +
                   Math.sin(2 * Math.PI * freq * 2 * t) * 0.5) * envelope * 0.2;
      }
      return buffer;
    });

    // Bounce sound - paddle bounce
    createSound(AUDIO.SFX.BOUNCE, (ctx) => {
      const duration = 0.15;
      const buffer = ctx.createBuffer(1, ctx.sampleRate * duration, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) {
        const t = i / ctx.sampleRate;
        const envelope = Math.exp(-t * 12);  // Slower decay for audibility
        const freq = 200 + (1 - t / duration) * 300; // Pitch drop
        data[i] = Math.sin(2 * Math.PI * freq * t) * envelope * 0.5;
      }
      return buffer;
    });

    // Scratch sound - record scratch for life lost
    createSound(AUDIO.SFX.SCRATCH, (ctx) => {
      const duration = 0.4;
      const buffer = ctx.createBuffer(1, ctx.sampleRate * duration, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) {
        const t = i / ctx.sampleRate;
        const envelope = Math.exp(-t * 4);
        // Noise with pitch sweep
        const noise = (Math.random() * 2 - 1);
        const sweep = Math.sin(2 * Math.PI * (800 - t * 1500) * t);
        data[i] = (noise * 0.3 + sweep * 0.4) * envelope * 0.3;
      }
      return buffer;
    });

    // Airhorn sound - level clear celebration
    createSound(AUDIO.SFX.AIRHORN, (ctx) => {
      const duration = 0.5;
      const buffer = ctx.createBuffer(1, ctx.sampleRate * duration, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) {
        const t = i / ctx.sampleRate;
        const envelope = t < 0.05 ? t / 0.05 : Math.exp(-(t - 0.05) * 3);
        const freq = 440;
        data[i] = (Math.sin(2 * Math.PI * freq * t) +
                   Math.sin(2 * Math.PI * freq * 1.5 * t) * 0.6 +
                   Math.sin(2 * Math.PI * freq * 2 * t) * 0.4) * envelope * 0.25;
      }
      return buffer;
    });

    // Chime sound - power-up collect
    createSound(AUDIO.SFX.CHIME, (ctx) => {
      const duration = 0.4;
      const buffer = ctx.createBuffer(1, ctx.sampleRate * duration, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) {
        const t = i / ctx.sampleRate;
        const envelope = Math.exp(-t * 6);
        // Major chord arpeggio feel
        const f1 = 880, f2 = 1109, f3 = 1319; // A5, C#6, E6
        data[i] = (Math.sin(2 * Math.PI * f1 * t) +
                   Math.sin(2 * Math.PI * f2 * t) * 0.7 +
                   Math.sin(2 * Math.PI * f3 * t) * 0.5) * envelope * 0.15;
      }
      return buffer;
    });

    // Trombone sound - sad wah-wah for game over
    createSound(AUDIO.SFX.TROMBONE, (ctx) => {
      const duration = 1.2;
      const buffer = ctx.createBuffer(1, ctx.sampleRate * duration, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      const notes = [
        { start: 0, dur: 0.3, freq: 311 },     // Eb4
        { start: 0.3, dur: 0.3, freq: 277 },   // Db4
        { start: 0.6, dur: 0.3, freq: 247 },   // B3
        { start: 0.9, dur: 0.3, freq: 233 },   // Bb3
      ];
      for (let i = 0; i < data.length; i++) {
        const t = i / ctx.sampleRate;
        let sample = 0;
        for (const note of notes) {
          if (t >= note.start && t < note.start + note.dur) {
            const noteT = t - note.start;
            const envelope = Math.sin(Math.PI * noteT / note.dur);
            // Add some vibrato/wah effect
            const vibrato = 1 + Math.sin(noteT * 15) * 0.05;
            sample += Math.sin(2 * Math.PI * note.freq * vibrato * noteT) * envelope;
          }
        }
        data[i] = sample * 0.2;
      }
      return buffer;
    });

    // Whoosh sound - transition exit (elements flying out)
    createSound(AUDIO.SFX.WHOOSH, (ctx) => {
      const duration = 0.4;
      const buffer = ctx.createBuffer(1, ctx.sampleRate * duration, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) {
        const t = i / ctx.sampleRate;
        const envelope = Math.sin(Math.PI * t / duration);
        // White noise with frequency sweep down
        const noise = (Math.random() * 2 - 1) * 0.3;
        const sweep = Math.sin(2 * Math.PI * (400 + (1 - t / duration) * 600) * t) * 0.35;
        data[i] = (noise + sweep) * envelope * 0.4;
      }
      return buffer;
    });

    // Swoosh sound - transition enter (new scene appearing)
    createSound(AUDIO.SFX.SWOOSH, (ctx) => {
      const duration = 0.35;
      const buffer = ctx.createBuffer(1, ctx.sampleRate * duration, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) {
        const t = i / ctx.sampleRate;
        const envelope = t < 0.1 ? t / 0.1 : Math.exp(-(t - 0.1) * 5);
        // Rising pitch sweep
        const sweep = Math.sin(2 * Math.PI * (300 + t * 800) * t) * 0.45;
        const noise = (Math.random() * 2 - 1) * 0.15;
        data[i] = (sweep + noise) * envelope * 0.35;
      }
      return buffer;
    });

    // Zap sound - electric arc for Electric Ball AOE
    createSound(AUDIO.SFX.ZAP, (ctx) => {
      const duration = 0.15;
      const buffer = ctx.createBuffer(1, ctx.sampleRate * duration, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) {
        const t = i / ctx.sampleRate;
        const envelope = Math.exp(-t * 20);
        // High frequency buzz with noise for electric crackle
        const buzz = Math.sin(2 * Math.PI * 2000 * t) * Math.sin(2 * Math.PI * 50 * t);
        const noise = (Math.random() * 2 - 1) * 0.3;
        data[i] = (buzz + noise) * envelope * 0.25;
      }
      return buffer;
    });

    // Note: Menu music is loaded from file in preload() - see 'audio/music/menu/menu-theme.mp3'
    // Placeholder was removed since real file exists
  }

  /**
   * Convert AudioBuffer to WAV format
   */
  private audioBufferToWav(buffer: AudioBuffer): ArrayBuffer {
    const numChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const format = 1; // PCM
    const bitDepth = 16;

    const bytesPerSample = bitDepth / 8;
    const blockAlign = numChannels * bytesPerSample;

    const samples = buffer.getChannelData(0);
    const dataLength = samples.length * bytesPerSample;
    const bufferLength = 44 + dataLength;

    const arrayBuffer = new ArrayBuffer(bufferLength);
    const view = new DataView(arrayBuffer);

    // WAV header
    const writeString = (offset: number, str: string) => {
      for (let i = 0; i < str.length; i++) {
        view.setUint8(offset + i, str.charCodeAt(i));
      }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, bufferLength - 8, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true); // fmt chunk size
    view.setUint16(20, format, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * blockAlign, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitDepth, true);
    writeString(36, 'data');
    view.setUint32(40, dataLength, true);

    // Write samples
    let offset = 44;
    for (let i = 0; i < samples.length; i++) {
      const sample = Math.max(-1, Math.min(1, samples[i]));
      const value = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
      view.setInt16(offset, value, true);
      offset += 2;
    }

    return arrayBuffer;
  }
}
