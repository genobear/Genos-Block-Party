import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config/Constants';
import { AudioManager, TrackInfo } from '../systems/AudioManager';

/**
 * Radio color palette - warm vintage aesthetic
 */
const RADIO_COLORS = {
  WOOD_DARK: 0x1a0f0a,
  WOOD_MEDIUM: 0x3d2317,
  WOOD_LIGHT: 0x5c3a2e,
  WOOD_HIGHLIGHT: 0x8b5a3c,
  DIAL_CREAM: 0xf5e6c8,
  DIAL_AMBER: 0xffb347,
  GLOW_ORANGE: 0xff6b35,
  CHROME: 0xc0c0c0,
  CHROME_DARK: 0x808080,
  VINYL_BLACK: 0x1a1a1a,
  FELT_GREEN: 0x1d4d3a,
  TEXT_CREAM: 0xf5e6c8,
  TEXT_GOLD: 0xd4a853,
  TEXT_DIM: 0x8b7355,
};

interface MusicPlayerSceneData {
  returnTo?: string;
}

export class MusicPlayerScene extends Phaser.Scene {
  private audioManager!: AudioManager;
  private returnTo: string = 'MenuScene';

  // Track data
  private allTracks: TrackInfo[] = [];
  private filteredTracks: TrackInfo[] = [];
  private currentFilter: 'all' | number = 'all';

  // UI elements
  private trackListItems: Phaser.GameObjects.Container[] = [];
  private scrollOffset: number = 0;
  private maxVisibleTracks: number = 6;
  private trackListContainer!: Phaser.GameObjects.Container;

  // Now playing display
  private trackNameText!: Phaser.GameObjects.Text;
  private artistText!: Phaser.GameObjects.Text;
  private genreText!: Phaser.GameObjects.Text;
  private playPauseText!: Phaser.GameObjects.Text;

  // Filter tabs
  private filterTabs: { button: Phaser.GameObjects.Rectangle; text: Phaser.GameObjects.Text; value: 'all' | number }[] = [];

  // Force track change toggle elements (to update when level lock changes)
  private forceTrackChangeSwitchBg!: Phaser.GameObjects.Rectangle;
  private forceTrackChangeSwitchKnob!: Phaser.GameObjects.Arc;
  private forceTrackChangeLabel!: Phaser.GameObjects.Text;

  // Volume slider elements
  private volumeValueText!: Phaser.GameObjects.Text;
  private volumeFill!: Phaser.GameObjects.Rectangle;
  private volumeHandle!: Phaser.GameObjects.Arc;

  // Tooltip container
  private activeTooltip: Phaser.GameObjects.Container | null = null;

  // Track change listener cleanup
  private unsubscribeTrackChange: (() => void) | null = null;

  constructor() {
    super('MusicPlayerScene');
  }

  init(data: MusicPlayerSceneData): void {
    this.returnTo = data.returnTo || 'MenuScene';
  }

  create(): void {
    // Reset all state for scene restart (critical for Phaser scene reuse)
    this.trackListItems = [];
    this.filterTabs = [];
    this.scrollOffset = 0;
    this.currentFilter = 'all';
    this.unsubscribeTrackChange = null;

    // Get AudioManager and init with this scene so it can use our sound/tween systems
    // (GameScene may be paused, so we need an active scene for audio operations)
    this.audioManager = AudioManager.getInstance();
    this.audioManager.init(this);

    // Load all tracks from manifest
    this.allTracks = this.audioManager.getAllTracks();
    this.filteredTracks = [...this.allTracks];

    // When opened from PauseScene, bring to top so it renders above game scenes
    if (this.returnTo === 'PauseScene') {
      this.scene.bringToTop();
    }

    // Create the radio cabinet
    this.createRadioCabinet();

    // Subscribe to track changes
    this.unsubscribeTrackChange = this.audioManager.onTrackChange(() => {
      this.updateNowPlayingDisplay();
      this.updateTrackListHighlights();
    });

    // Initial display update
    this.updateNowPlayingDisplay();

    // Keyboard shortcuts
    this.input.keyboard?.on('keydown-ESC', () => {
      this.goBack();
    });

    // Cleanup on shutdown
    this.events.on('shutdown', () => {
      if (this.unsubscribeTrackChange) {
        this.unsubscribeTrackChange();
        this.unsubscribeTrackChange = null;
      }
    });
  }

  private createRadioCabinet(): void {
    const centerX = GAME_WIDTH / 2;

    // Main cabinet frame
    const cabinet = this.add.container(centerX, GAME_HEIGHT / 2);

    // Outer frame
    const outerFrame = this.add.rectangle(0, 0, 620, 880, RADIO_COLORS.WOOD_DARK);
    outerFrame.setStrokeStyle(4, RADIO_COLORS.WOOD_HIGHLIGHT);
    cabinet.add(outerFrame);

    // Inner frame
    const innerFrame = this.add.rectangle(0, 0, 600, 860, RADIO_COLORS.WOOD_MEDIUM);
    cabinet.add(innerFrame);

    // Add wood grain effect with lines
    for (let i = -290; i < 290; i += 12) {
      const line = this.add.rectangle(i, 0, 1, 840, RADIO_COLORS.WOOD_DARK, 0.1);
      cabinet.add(line);
    }

    // Title
    const title = this.add.text(0, -390, '🎵 MUSIC PLAYER 🎵', {
      font: 'bold 28px Arial',
      color: '#ffb347',
    }).setOrigin(0.5);
    cabinet.add(title);

    const subtitle = this.add.text(0, -360, "GENO'S BLOCK PARTY", {
      font: '12px Arial',
      color: '#8b7355',
    }).setOrigin(0.5);
    cabinet.add(subtitle);

    // Vacuum tubes row
    this.createVacuumTubes(cabinet, 0, -320);

    // Dial display (now playing)
    this.createDialDisplay(cabinet, 0, -230);

    // Playback controls
    this.createPlaybackControls(cabinet, 0, -120);

    // Filter tabs (extra gap after playback controls)
    this.createFilterTabs(cabinet, 0, -35);

    // Track list
    this.createTrackList(cabinet, 0, 155);

    // Level Theme Lock toggle
    this.createLevelThemeLockToggle(cabinet, 0, 310);

    // Force Track Change toggle (depends on Level Theme Lock)
    this.createForceTrackChangeToggle(cabinet, 0, 360);

    // Volume slider
    this.createVolumeSlider(cabinet, 0, 414);

    // Close button (top-left corner)
    this.createCloseButton(cabinet, -280, -400);

    // Corner screws
    this.createScrew(cabinet, -295, -425);
    this.createScrew(cabinet, 295, -425);
    this.createScrew(cabinet, -295, 425);
    this.createScrew(cabinet, 295, 425);

    // Animate in
    cabinet.setScale(0.9);
    cabinet.setAlpha(0);
    this.tweens.add({
      targets: cabinet,
      scale: 1,
      alpha: 1,
      duration: 300,
      ease: 'Back.easeOut',
    });
  }

  private createVacuumTubes(parent: Phaser.GameObjects.Container, x: number, y: number): void {
    const tubeContainer = this.add.container(x, y);

    for (let i = -2; i <= 2; i++) {
      const tube = this.add.container(i * 30, 0);

      // Tube body
      const body = this.add.rectangle(0, 0, 12, 24, RADIO_COLORS.WOOD_DARK);
      body.setStrokeStyle(1, RADIO_COLORS.WOOD_HIGHLIGHT, 0.5);
      tube.add(body);

      // Glowing filament
      const glow = this.add.circle(0, 4, 4, RADIO_COLORS.GLOW_ORANGE);
      glow.setAlpha(0.8);
      tube.add(glow);

      // Animate the glow
      this.tweens.add({
        targets: glow,
        alpha: { from: 0.6, to: 1 },
        duration: 500 + Math.random() * 500,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });

      tubeContainer.add(tube);
    }

    parent.add(tubeContainer);
  }

  private createDialDisplay(parent: Phaser.GameObjects.Container, x: number, y: number): void {
    const dial = this.add.container(x, y);

    // Dial background (dark inset)
    const dialBg = this.add.rectangle(0, 0, 500, 100, RADIO_COLORS.WOOD_DARK);
    dialBg.setStrokeStyle(2, 0x000000, 0.5);
    dial.add(dialBg);

    // Cream dial inner
    const dialInner = this.add.rectangle(0, 0, 490, 90, RADIO_COLORS.DIAL_CREAM);
    dial.add(dialInner);

    // Amber glow effect
    const glow = this.add.rectangle(0, 0, 400, 70, RADIO_COLORS.GLOW_ORANGE, 0.15);
    dial.add(glow);

    // Animate glow
    this.tweens.add({
      targets: glow,
      alpha: { from: 0.1, to: 0.2 },
      duration: 2000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // "Now Playing" label
    const nowPlayingLabel = this.add.text(0, -32, '♪ NOW PLAYING ♪', {
      font: '10px Arial',
      color: '#5c3a2e',
    }).setOrigin(0.5);
    dial.add(nowPlayingLabel);

    // Track name
    this.trackNameText = this.add.text(0, -10, 'No Track Playing', {
      font: 'bold 22px Arial',
      color: '#1a0f0a',
    }).setOrigin(0.5);
    dial.add(this.trackNameText);

    // Artist
    this.artistText = this.add.text(0, 14, '', {
      font: '14px Arial',
      color: '#5c3a2e',
    }).setOrigin(0.5);
    dial.add(this.artistText);

    // Genre
    this.genreText = this.add.text(0, 32, '', {
      font: '11px Arial',
      color: '#8b7355',
    }).setOrigin(0.5);
    dial.add(this.genreText);

    parent.add(dial);
  }

  private createPlaybackControls(parent: Phaser.GameObjects.Container, x: number, y: number): void {
    const controls = this.add.container(x, y);
    const buttonSize = 48;
    const spacing = 60;

    // Previous
    this.createControlButton(controls, -spacing * 1.5, 0, buttonSize, '⏮', false, () => {
      this.audioManager.skipToPreviousTrack();
    });

    // Stop
    this.createControlButton(controls, -spacing * 0.5, 0, buttonSize, '⏹', false, () => {
      this.audioManager.restartAndPause();
      this.playPauseText.setText('▶');
    });

    // Play/Pause (larger, orange)
    const playPauseBtn = this.createControlButton(controls, spacing * 0.5, 0, buttonSize + 12, '▶', true, () => {
      if (this.audioManager.isMusicPlaying()) {
        this.audioManager.pauseMusic();
        this.playPauseText.setText('▶');
      } else {
        this.audioManager.resumeMusic();
        this.playPauseText.setText('⏸');
      }
    });
    this.playPauseText = playPauseBtn.text;

    // Update initial state
    if (this.audioManager.isMusicPlaying()) {
      this.playPauseText.setText('⏸');
    }

    // Next
    this.createControlButton(controls, spacing * 1.5 + 6, 0, buttonSize, '⏭', false, () => {
      this.audioManager.skipToNextTrack();
    });

    parent.add(controls);
  }

  private createControlButton(
    parent: Phaser.GameObjects.Container,
    x: number,
    y: number,
    size: number,
    icon: string,
    isPrimary: boolean,
    onClick: () => void
  ): { button: Phaser.GameObjects.Rectangle; text: Phaser.GameObjects.Text } {
    const container = this.add.container(x, y);

    const bgColor = isPrimary ? RADIO_COLORS.DIAL_AMBER : RADIO_COLORS.CHROME;
    const bg = this.add.rectangle(0, 0, size, size, bgColor);
    bg.setStrokeStyle(2, isPrimary ? RADIO_COLORS.GLOW_ORANGE : RADIO_COLORS.CHROME_DARK);
    bg.setInteractive({ useHandCursor: true });
    container.add(bg);

    const text = this.add.text(0, 0, icon, {
      font: `bold ${isPrimary ? 24 : 20}px Arial`,
      color: isPrimary ? '#1a0f0a' : '#1a1a1a',
    }).setOrigin(0.5);
    container.add(text);

    bg.on('pointerover', () => {
      container.setScale(1.1);
    });

    bg.on('pointerout', () => {
      container.setScale(1);
    });

    bg.on('pointerdown', onClick);

    parent.add(container);
    return { button: bg, text };
  }

  private createFilterTabs(parent: Phaser.GameObjects.Container, x: number, y: number): void {
    const tabs = this.add.container(x, y);

    // Label
    const label = this.add.text(0, -25, '⟡ SELECT STATION ⟡', {
      font: '10px Arial',
      color: '#8b7355',
    }).setOrigin(0.5);
    tabs.add(label);

    // Tab container background (taller to fit two rows)
    const tabBg = this.add.rectangle(0, 18, 450, 70, RADIO_COLORS.VINYL_BLACK);
    tabBg.setStrokeStyle(1, 0x333333);
    tabs.add(tabBg);

    // Available levels
    const levels = this.audioManager.getAvailableLevelsWithMusic();
    const filters: { label: string; value: 'all' | number }[] = [
      { label: 'ALL', value: 'all' },
      ...levels.map(l => ({ label: `LVL ${l}`, value: l })),
      { label: 'MENU', value: 0 },
    ];

    // Split into two rows: 6 tabs top, rest bottom
    const tabWidth = 72;
    const tabHeight = 26;
    const row1Count = 6;
    const row1Y = 3;
    const row2Y = 33;

    filters.forEach((filter, i) => {
      const isRow1 = i < row1Count;
      const rowIndex = isRow1 ? i : i - row1Count;
      const rowCount = isRow1 ? row1Count : filters.length - row1Count;
      const tabY = isRow1 ? row1Y : row2Y;

      // Center each row independently
      const startX = -((rowCount - 1) * tabWidth) / 2;
      const tabX = startX + rowIndex * tabWidth;

      const btn = this.add.rectangle(tabX, tabY, 65, tabHeight, RADIO_COLORS.WOOD_DARK);
      btn.setStrokeStyle(1, 0x333333);
      btn.setInteractive({ useHandCursor: true });
      tabs.add(btn);

      const txt = this.add.text(tabX, tabY, filter.label, {
        font: '11px Arial',
        color: '#8b7355',
      }).setOrigin(0.5);
      tabs.add(txt);

      this.filterTabs.push({ button: btn, text: txt, value: filter.value });

      btn.on('pointerover', () => {
        if (this.currentFilter !== filter.value) {
          btn.setFillStyle(RADIO_COLORS.WOOD_MEDIUM);
        }
      });

      btn.on('pointerout', () => {
        if (this.currentFilter !== filter.value) {
          btn.setFillStyle(RADIO_COLORS.WOOD_DARK);
        }
      });

      btn.on('pointerdown', () => {
        this.setFilter(filter.value);
      });
    });

    // Set initial active tab
    this.updateFilterTabStyles();

    parent.add(tabs);
  }

  private setFilter(filter: 'all' | number): void {
    this.currentFilter = filter;
    this.scrollOffset = 0;

    // Convert filter to station format for AudioManager (0 = menu → null)
    const station = filter === 0 ? null : filter;
    this.audioManager.setSelectedStation(station);

    if (filter === 'all') {
      this.filteredTracks = [...this.allTracks];
    } else if (filter === 0) {
      // Menu music
      this.filteredTracks = this.allTracks.filter(t => t.level === null);
    } else {
      this.filteredTracks = this.allTracks.filter(t => t.level === filter);
    }

    this.updateFilterTabStyles();
    this.updateTrackListDisplay();
  }

  private updateFilterTabStyles(): void {
    this.filterTabs.forEach(tab => {
      if (tab.value === this.currentFilter) {
        tab.button.setFillStyle(RADIO_COLORS.DIAL_AMBER);
        tab.text.setColor('#1a0f0a');
      } else {
        tab.button.setFillStyle(RADIO_COLORS.WOOD_DARK);
        tab.text.setColor('#8b7355');
      }
    });
  }

  private createTrackList(parent: Phaser.GameObjects.Container, x: number, y: number): void {
    this.trackListContainer = this.add.container(x, y);

    // Background
    const listBg = this.add.rectangle(0, 0, 500, 250, RADIO_COLORS.VINYL_BLACK);
    listBg.setStrokeStyle(2, 0x333333);
    this.trackListContainer.add(listBg);

    // Create track item slots
    const itemHeight = 38;
    const listPadding = 8; // Top padding to prevent first row overlapping container edge
    const startY = -((this.maxVisibleTracks - 1) * itemHeight) / 2 + listPadding;

    for (let i = 0; i < this.maxVisibleTracks; i++) {
      const itemY = startY + i * itemHeight;
      const item = this.createTrackListItem(itemY);
      this.trackListItems.push(item);
      this.trackListContainer.add(item);
    }

    // Scroll buttons
    this.createScrollButton(this.trackListContainer, 230, -80, '▲', () => this.scrollTrackList(-1));
    this.createScrollButton(this.trackListContainer, 230, 80, '▼', () => this.scrollTrackList(1));

    // Enable mouse wheel scrolling
    listBg.setInteractive();
    this.input.on('wheel', (_pointer: Phaser.Input.Pointer, _gameObjects: Phaser.GameObjects.GameObject[], _deltaX: number, deltaY: number) => {
      this.scrollTrackList(deltaY > 0 ? 1 : -1);
    });

    parent.add(this.trackListContainer);

    // Initial display
    this.updateTrackListDisplay();
  }

  private createTrackListItem(y: number): Phaser.GameObjects.Container {
    const item = this.add.container(0, y);

    // Background (narrower to leave space for scroll buttons)
    const bg = this.add.rectangle(-10, 0, 440, 34, 0x2a2a2a);
    bg.setInteractive({ useHandCursor: true });
    item.add(bg);

    // Playing indicator
    const playingIcon = this.add.text(-220, 0, '▶', {
      font: 'bold 14px Arial',
      color: '#ff6b35',
    }).setOrigin(0.5).setVisible(false);
    item.add(playingIcon);

    // Track name
    const nameText = this.add.text(-200, -6, '', {
      font: '14px Arial',
      color: '#f5e6c8',
    }).setOrigin(0, 0.5);
    item.add(nameText);

    // Artist
    const artistText = this.add.text(-200, 10, '', {
      font: '11px Arial',
      color: '#8b7355',
    }).setOrigin(0, 0.5);
    item.add(artistText);

    // Level badge (positioned left of scroll buttons at x=230)
    const levelBadge = this.add.rectangle(170, 0, 50, 20, RADIO_COLORS.WOOD_MEDIUM);
    item.add(levelBadge);

    const levelText = this.add.text(170, 0, '', {
      font: '10px Arial',
      color: '#f5e6c8',
    }).setOrigin(0.5);
    item.add(levelText);

    // Store references
    item.setData('bg', bg);
    item.setData('playingIcon', playingIcon);
    item.setData('nameText', nameText);
    item.setData('artistText', artistText);
    item.setData('levelBadge', levelBadge);
    item.setData('levelText', levelText);
    item.setData('trackIndex', -1);

    // Hover effects
    bg.on('pointerover', () => {
      bg.setFillStyle(0x3a3a3a);
    });

    bg.on('pointerout', () => {
      const isPlaying = item.getData('isPlaying');
      bg.setFillStyle(isPlaying ? 0x3a2a1a : 0x2a2a2a);
    });

    bg.on('pointerdown', () => {
      const trackIndex = item.getData('trackIndex');
      if (trackIndex >= 0 && trackIndex < this.filteredTracks.length) {
        this.playTrack(this.filteredTracks[trackIndex]);
      }
    });

    return item;
  }

  private createScrollButton(
    parent: Phaser.GameObjects.Container,
    x: number,
    y: number,
    icon: string,
    onClick: () => void
  ): void {
    const btn = this.add.container(x, y);

    const bg = this.add.rectangle(0, 0, 24, 24, RADIO_COLORS.WOOD_MEDIUM);
    bg.setInteractive({ useHandCursor: true });
    btn.add(bg);

    const text = this.add.text(0, 0, icon, {
      font: '12px Arial',
      color: '#f5e6c8',
    }).setOrigin(0.5);
    btn.add(text);

    bg.on('pointerover', () => bg.setFillStyle(RADIO_COLORS.WOOD_HIGHLIGHT));
    bg.on('pointerout', () => bg.setFillStyle(RADIO_COLORS.WOOD_MEDIUM));
    bg.on('pointerdown', onClick);

    parent.add(btn);
  }

  private scrollTrackList(direction: number): void {
    const maxScroll = Math.max(0, this.filteredTracks.length - this.maxVisibleTracks);
    this.scrollOffset = Phaser.Math.Clamp(this.scrollOffset + direction, 0, maxScroll);
    this.updateTrackListDisplay();
  }

  private updateTrackListDisplay(): void {
    const currentKey = this.audioManager.getCurrentTrackKey();

    for (let i = 0; i < this.maxVisibleTracks; i++) {
      const item = this.trackListItems[i];
      const trackIndex = this.scrollOffset + i;
      const track = this.filteredTracks[trackIndex];

      if (track) {
        item.setVisible(true);
        item.setData('trackIndex', trackIndex);

        const nameText = item.getData('nameText') as Phaser.GameObjects.Text;
        const artistText = item.getData('artistText') as Phaser.GameObjects.Text;
        const levelText = item.getData('levelText') as Phaser.GameObjects.Text;
        const levelBadge = item.getData('levelBadge') as Phaser.GameObjects.Rectangle;
        const playingIcon = item.getData('playingIcon') as Phaser.GameObjects.Text;
        const bg = item.getData('bg') as Phaser.GameObjects.Rectangle;

        nameText.setText(track.metadata.name || 'Unknown Track');
        artistText.setText(track.metadata.artist || 'Unknown Artist');

        // Level badge
        if (track.level === null) {
          levelText.setText('MENU');
          levelBadge.setFillStyle(RADIO_COLORS.FELT_GREEN);
        } else {
          levelText.setText(`LVL ${track.level}`);
          levelBadge.setFillStyle(RADIO_COLORS.WOOD_MEDIUM);
        }

        // Playing state
        const isPlaying = track.key === currentKey;
        item.setData('isPlaying', isPlaying);
        playingIcon.setVisible(isPlaying);
        bg.setFillStyle(isPlaying ? 0x3a2a1a : 0x2a2a2a);

        // Animate playing indicator
        if (isPlaying) {
          this.tweens.add({
            targets: playingIcon,
            alpha: { from: 1, to: 0.4 },
            duration: 500,
            yoyo: true,
            repeat: -1,
          });
        }
      } else {
        item.setVisible(false);
      }
    }
  }

  private updateTrackListHighlights(): void {
    this.updateTrackListDisplay();
  }

  private playTrack(track: TrackInfo): void {
    this.audioManager.playTrackByKey(track);
    this.playPauseText.setText('⏸');
  }

  private createLevelThemeLockToggle(parent: Phaser.GameObjects.Container, x: number, y: number): void {
    const toggle = this.add.container(x, y);

    // Background
    const bg = this.add.rectangle(0, 0, 450, 40, 0x000000, 0.3);
    toggle.add(bg);

    // Toggle switch
    const isOn = this.audioManager.isForceLevelMusic();

    const switchBg = this.add.rectangle(-160, 0, 48, 26, isOn ? RADIO_COLORS.DIAL_AMBER : RADIO_COLORS.VINYL_BLACK);
    switchBg.setStrokeStyle(1, isOn ? RADIO_COLORS.GLOW_ORANGE : 0x333333);
    switchBg.setInteractive({ useHandCursor: true });
    toggle.add(switchBg);

    const switchKnob = this.add.circle(isOn ? -148 : -172, 0, 10, 0xffffff);
    toggle.add(switchKnob);

    // Label
    const label = this.add.text(-120, 0, 'Level Theme Lock', {
      font: '16px Arial',
      color: '#f5e6c8',
    }).setOrigin(0, 0.5);
    toggle.add(label);

    // Info icon with tooltip
    this.createInfoIcon(toggle, 180, 0, 'When ON, only songs from the\ncurrent level play during gameplay');

    // Toggle interaction
    switchBg.on('pointerdown', () => {
      const newValue = !this.audioManager.isForceLevelMusic();
      this.audioManager.setForceLevelMusic(newValue);

      // Update visuals
      switchBg.setFillStyle(newValue ? RADIO_COLORS.DIAL_AMBER : RADIO_COLORS.VINYL_BLACK);
      switchBg.setStrokeStyle(1, newValue ? RADIO_COLORS.GLOW_ORANGE : 0x333333);

      // Animate knob
      this.tweens.add({
        targets: switchKnob,
        x: newValue ? -148 : -172,
        duration: 150,
        ease: 'Power2',
      });

      // Update Force Track Change toggle's enabled state
      this.updateForceTrackChangeToggleState(newValue);
    });

    parent.add(toggle);
  }

  /**
   * Update the Force Track Change toggle's visual state based on Level Theme Lock
   */
  private updateForceTrackChangeToggleState(levelLockEnabled: boolean): void {
    if (!this.forceTrackChangeSwitchBg) return;

    // Update enabled/disabled appearance
    this.forceTrackChangeSwitchBg.setAlpha(levelLockEnabled ? 1 : 0.4);
    this.forceTrackChangeSwitchKnob.setAlpha(levelLockEnabled ? 1 : 0.4);
    this.forceTrackChangeLabel.setColor(levelLockEnabled ? '#f5e6c8' : '#666666');

    // If level lock was turned OFF, force track change is also turned off
    if (!levelLockEnabled) {
      this.forceTrackChangeSwitchBg.setFillStyle(RADIO_COLORS.VINYL_BLACK);
      this.forceTrackChangeSwitchBg.setStrokeStyle(1, 0x333333);

      // Animate knob to OFF position
      this.tweens.add({
        targets: this.forceTrackChangeSwitchKnob,
        x: -172,
        duration: 150,
        ease: 'Power2',
      });
    }
  }

  private createForceTrackChangeToggle(parent: Phaser.GameObjects.Container, x: number, y: number): void {
    const toggle = this.add.container(x, y);

    // Background
    const bg = this.add.rectangle(0, 0, 450, 40, 0x000000, 0.3);
    toggle.add(bg);

    // Check if enabled (only available when level lock is ON)
    const levelLockOn = this.audioManager.isForceLevelMusic();
    const isOn = this.audioManager.isForceTrackChangeOnTransition();

    // Toggle switch
    this.forceTrackChangeSwitchBg = this.add.rectangle(-160, 0, 48, 26,
      isOn ? RADIO_COLORS.DIAL_AMBER : RADIO_COLORS.VINYL_BLACK);
    this.forceTrackChangeSwitchBg.setStrokeStyle(1, isOn ? RADIO_COLORS.GLOW_ORANGE : 0x333333);
    this.forceTrackChangeSwitchBg.setInteractive({ useHandCursor: true });
    this.forceTrackChangeSwitchBg.setAlpha(levelLockOn ? 1 : 0.4);
    toggle.add(this.forceTrackChangeSwitchBg);

    this.forceTrackChangeSwitchKnob = this.add.circle(isOn ? -148 : -172, 0, 10, 0xffffff);
    this.forceTrackChangeSwitchKnob.setAlpha(levelLockOn ? 1 : 0.4);
    toggle.add(this.forceTrackChangeSwitchKnob);

    // Label
    this.forceTrackChangeLabel = this.add.text(-120, 0, 'Force Track Change', {
      font: '14px Arial',
      color: levelLockOn ? '#f5e6c8' : '#666666',
    }).setOrigin(0, 0.5);
    toggle.add(this.forceTrackChangeLabel);

    // Info icon with tooltip
    this.createInfoIcon(toggle, 180, 0, 'Auto-switch tracks on level/menu\ntransitions (requires Level Theme Lock)');

    // Toggle interaction
    this.forceTrackChangeSwitchBg.on('pointerdown', () => {
      // Only allow toggle if level lock is ON
      if (!this.audioManager.isForceLevelMusic()) {
        return;
      }

      const newValue = !this.audioManager.isForceTrackChangeOnTransition();
      this.audioManager.setForceTrackChangeOnTransition(newValue);

      // Update visuals
      this.forceTrackChangeSwitchBg.setFillStyle(newValue ? RADIO_COLORS.DIAL_AMBER : RADIO_COLORS.VINYL_BLACK);
      this.forceTrackChangeSwitchBg.setStrokeStyle(1, newValue ? RADIO_COLORS.GLOW_ORANGE : 0x333333);

      // Animate knob
      this.tweens.add({
        targets: this.forceTrackChangeSwitchKnob,
        x: newValue ? -148 : -172,
        duration: 150,
        ease: 'Power2',
      });
    });

    parent.add(toggle);
  }

  private createInfoIcon(parent: Phaser.GameObjects.Container, x: number, y: number, tooltipText: string): void {
    const icon = this.add.text(x, y, 'ⓘ', {
      font: '16px Arial',
      color: '#8b7355',
    }).setOrigin(0.5);
    icon.setInteractive({ useHandCursor: true });
    parent.add(icon);

    icon.on('pointerover', () => {
      icon.setColor('#f5e6c8');
      this.showTooltip(x, y - 45, tooltipText, parent);
    });

    icon.on('pointerout', () => {
      icon.setColor('#8b7355');
      this.hideTooltip();
    });
  }

  private showTooltip(x: number, y: number, text: string, parent: Phaser.GameObjects.Container): void {
    this.hideTooltip();

    const tooltip = this.add.container(x, y);

    // Calculate text dimensions
    const tempText = this.add.text(0, 0, text, {
      font: '11px Arial',
      color: '#f5e6c8',
      align: 'center',
    }).setOrigin(0.5);

    const padding = 10;
    const bgWidth = tempText.width + padding * 2;
    const bgHeight = tempText.height + padding * 2;

    // Background
    const bg = this.add.rectangle(0, 0, bgWidth, bgHeight, RADIO_COLORS.WOOD_DARK, 0.95);
    bg.setStrokeStyle(1, RADIO_COLORS.WOOD_HIGHLIGHT);
    tooltip.add(bg);

    // Text
    tempText.setOrigin(0.5);
    tooltip.add(tempText);

    // Arrow pointing down
    const arrow = this.add.triangle(0, bgHeight / 2 + 5, -6, 0, 6, 0, 0, 8, RADIO_COLORS.WOOD_DARK);
    tooltip.add(arrow);

    parent.add(tooltip);
    this.activeTooltip = tooltip;

    // Animate in
    tooltip.setAlpha(0);
    tooltip.setScale(0.9);
    this.tweens.add({
      targets: tooltip,
      alpha: 1,
      scale: 1,
      duration: 150,
      ease: 'Power2',
    });
  }

  private hideTooltip(): void {
    if (this.activeTooltip) {
      this.activeTooltip.destroy();
      this.activeTooltip = null;
    }
  }

  private createVolumeSlider(parent: Phaser.GameObjects.Container, x: number, y: number): void {
    const slider = this.add.container(x, y);
    const sliderWidth = 200;
    const sliderHeight = 8;

    // Background
    const bg = this.add.rectangle(0, 0, 450, 42, 0x000000, 0.3);
    slider.add(bg);

    // Volume icon
    const icon = this.add.text(-200, 0, '🔊', {
      font: '18px Arial',
    }).setOrigin(0.5);
    slider.add(icon);

    // Label
    const label = this.add.text(-165, 0, 'VOLUME', {
      font: '12px Arial',
      color: '#8b7355',
    }).setOrigin(0, 0.5);
    slider.add(label);

    // Track background
    const track = this.add.rectangle(-20, 0, sliderWidth, sliderHeight, RADIO_COLORS.WOOD_DARK)
      .setOrigin(0, 0.5);
    track.setStrokeStyle(1, 0x333333);
    slider.add(track);

    // Fill bar
    const initialValue = this.audioManager.getMusicVolume();
    this.volumeFill = this.add.rectangle(-20, 0, sliderWidth * initialValue, sliderHeight, RADIO_COLORS.DIAL_AMBER)
      .setOrigin(0, 0.5);
    slider.add(this.volumeFill);

    // Handle
    this.volumeHandle = this.add.circle(-20 + sliderWidth * initialValue, 0, 10, RADIO_COLORS.DIAL_CREAM);
    this.volumeHandle.setStrokeStyle(2, RADIO_COLORS.WOOD_HIGHLIGHT);
    this.volumeHandle.setInteractive({ useHandCursor: true, draggable: true });
    slider.add(this.volumeHandle);

    // Value display
    this.volumeValueText = this.add.text(200, 0, `${Math.round(initialValue * 100)}%`, {
      font: 'bold 14px Arial',
      color: '#f5e6c8',
    }).setOrigin(0, 0.5);
    slider.add(this.volumeValueText);

    // Make track clickable
    track.setInteractive({ useHandCursor: true });
    track.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      const localX = pointer.x - (GAME_WIDTH / 2 + x - 20);
      const value = Phaser.Math.Clamp(localX / sliderWidth, 0, 1);
      this.updateVolumeSlider(value, sliderWidth);
    });

    // Drag handling
    this.input.on('drag', (_pointer: Phaser.Input.Pointer, gameObject: Phaser.GameObjects.GameObject, dragX: number) => {
      if (gameObject === this.volumeHandle) {
        const value = Phaser.Math.Clamp((dragX + 20) / sliderWidth, 0, 1);
        this.updateVolumeSlider(value, sliderWidth);
      }
    });

    parent.add(slider);
  }

  private updateVolumeSlider(value: number, sliderWidth: number): void {
    this.volumeHandle.x = -20 + value * sliderWidth;
    this.volumeFill.width = value * sliderWidth;
    this.volumeValueText.setText(`${Math.round(value * 100)}%`);
    this.audioManager.setMusicVolume(value);
  }

  private createCloseButton(parent: Phaser.GameObjects.Container, x: number, y: number): void {
    const btn = this.add.container(x, y);

    const bg = this.add.circle(0, 0, 14, RADIO_COLORS.WOOD_MEDIUM);
    bg.setStrokeStyle(2, RADIO_COLORS.WOOD_HIGHLIGHT);
    bg.setInteractive({ useHandCursor: true });
    btn.add(bg);

    const text = this.add.text(0, 0, '✕', {
      font: 'bold 16px Arial',
      color: '#f5e6c8',
    }).setOrigin(0.5);
    btn.add(text);

    bg.on('pointerover', () => {
      bg.setFillStyle(RADIO_COLORS.WOOD_HIGHLIGHT);
    });

    bg.on('pointerout', () => {
      bg.setFillStyle(RADIO_COLORS.WOOD_MEDIUM);
    });

    bg.on('pointerdown', () => {
      this.goBack();
    });

    parent.add(btn);
  }

  private createScrew(parent: Phaser.GameObjects.Container, x: number, y: number): void {
    const screw = this.add.container(x, y);

    const base = this.add.circle(0, 0, 8, RADIO_COLORS.CHROME);
    screw.add(base);

    // Slot
    const slot = this.add.rectangle(0, 0, 10, 2, RADIO_COLORS.CHROME_DARK);
    slot.setRotation(Math.PI / 4);
    screw.add(slot);

    parent.add(screw);
  }

  private updateNowPlayingDisplay(): void {
    const metadata = this.audioManager.getCurrentTrackMetadata();

    if (metadata && metadata.name) {
      this.trackNameText.setText(metadata.name);
      this.artistText.setText(metadata.artist || 'Unknown Artist');
      this.genreText.setText(metadata.genre || '');

      if (this.audioManager.isMusicPlaying()) {
        this.playPauseText.setText('⏸');
      }
    } else {
      this.trackNameText.setText('No Track Playing');
      this.artistText.setText('');
      this.genreText.setText('');
    }
  }

  private goBack(): void {
    if (this.returnTo === 'PauseScene') {
      // Stop overlay and relaunch PauseScene
      this.scene.stop();
      this.scene.launch('PauseScene');
    } else {
      this.scene.start(this.returnTo);
    }
  }
}
