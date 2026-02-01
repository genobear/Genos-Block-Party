import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS } from '../config/Constants';
import { AudioManager } from '../systems/AudioManager';

export class SettingsScene extends Phaser.Scene {
  private audioManager!: AudioManager;
  private returnTo: string = 'MenuScene';

  constructor() {
    super('SettingsScene');
  }

  init(data: { returnTo?: string }): void {
    this.returnTo = data?.returnTo || 'MenuScene';
  }

  create(): void {
    this.audioManager = AudioManager.getInstance();

    // Bring to top so it renders above other scenes
    this.scene.bringToTop();

    // Full-screen dimmed backdrop
    const backdrop = this.add.rectangle(
      GAME_WIDTH / 2,
      GAME_HEIGHT / 2,
      GAME_WIDTH,
      GAME_HEIGHT,
      0x000000,
      0.6
    );
    backdrop.setInteractive(); // Block clicks from passing through

    // Panel dimensions
    const panelWidth = 340;
    const panelHeight = 300;
    const centerX = GAME_WIDTH / 2;
    const centerY = GAME_HEIGHT / 2;

    // Container centered on screen
    const container = this.add.container(centerX, centerY);

    // Panel background with rounded corners effect (using graphics for polish)
    const panelBg = this.add.graphics();
    panelBg.fillStyle(0x1a1a2e, 0.98);
    panelBg.fillRoundedRect(-panelWidth / 2, -panelHeight / 2, panelWidth, panelHeight, 16);
    panelBg.lineStyle(2, 0x3d3d5c);
    panelBg.strokeRoundedRect(-panelWidth / 2, -panelHeight / 2, panelWidth, panelHeight, 16);
    container.add(panelBg);

    // Title - positioned at top of panel with padding
    const title = this.add.text(0, -panelHeight / 2 + 40, 'SETTINGS', {
      font: 'bold 36px Arial',
      color: '#ffffff',
    }).setOrigin(0.5);
    container.add(title);

    // Audio section header
    const audioHeader = this.add.text(0, -panelHeight / 2 + 90, 'Audio', {
      font: 'bold 20px Arial',
      color: '#a78bfa',
    }).setOrigin(0.5);
    container.add(audioHeader);

    // Slider layout constants
    const labelX = -panelWidth / 2 + 30;
    const sliderX = -15;
    const musicY = -panelHeight / 2 + 140;
    const sfxY = -panelHeight / 2 + 190;

    // Music volume slider
    const musicLabel = this.add.text(labelX, musicY, 'Music:', {
      font: '18px Arial',
      color: '#cccccc',
    }).setOrigin(0, 0.5);
    container.add(musicLabel);

    const musicSlider = this.createVolumeSlider(
      sliderX, musicY,
      this.audioManager.getMusicVolume(),
      (value) => this.audioManager.setMusicVolume(value)
    );
    container.add(musicSlider);

    // SFX volume slider
    const sfxLabel = this.add.text(labelX, sfxY, 'SFX:', {
      font: '18px Arial',
      color: '#cccccc',
    }).setOrigin(0, 0.5);
    container.add(sfxLabel);

    const sfxSlider = this.createVolumeSlider(
      sliderX, sfxY,
      this.audioManager.getSfxVolume(),
      (value) => this.audioManager.setSfxVolume(value)
    );
    container.add(sfxSlider);

    // Back button - positioned at bottom of panel
    const backButton = this.createButton(0, panelHeight / 2 - 50, 'BACK', 0x4a4a6a, () => {
      // PauseScene stops itself before launching Settings, so we need to re-launch it
      // MenuScene stays running as an overlay, so just stopping Settings is enough
      if (this.returnTo === 'PauseScene') {
        this.scene.launch('PauseScene');
      }
      this.scene.stop();
    });
    container.add(backButton);

    // Animate in with scale + fade
    container.setAlpha(0);
    container.setScale(0.9);
    backdrop.setAlpha(0);

    this.tweens.add({
      targets: backdrop,
      alpha: 1,
      duration: 150,
    });

    this.tweens.add({
      targets: container,
      alpha: 1,
      scale: 1,
      duration: 200,
      ease: 'Back.easeOut',
    });
  }

  private createButton(
    x: number,
    y: number,
    text: string,
    color: number,
    onClick: () => void
  ): Phaser.GameObjects.Container {
    const buttonContainer = this.add.container(x, y);
    const width = 180;
    const height = 44;

    // Rounded rectangle background
    const bg = this.add.graphics();
    bg.fillStyle(color, 1);
    bg.fillRoundedRect(-width / 2, -height / 2, width, height, 8);
    buttonContainer.add(bg);

    // Invisible hit area for interaction
    const hitArea = this.add.rectangle(0, 0, width, height, 0x000000, 0)
      .setInteractive({ useHandCursor: true });
    buttonContainer.add(hitArea);

    const buttonText = this.add.text(0, 0, text, {
      font: 'bold 18px Arial',
      color: '#ffffff',
    }).setOrigin(0.5);
    buttonContainer.add(buttonText);

    hitArea.on('pointerover', () => buttonContainer.setScale(1.05));
    hitArea.on('pointerout', () => buttonContainer.setScale(1));
    hitArea.on('pointerdown', onClick);

    return buttonContainer;
  }

  private createVolumeSlider(
    x: number,
    y: number,
    initialValue: number,
    onChange: (value: number) => void
  ): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);
    const sliderWidth = 150;
    const sliderHeight = 10;

    // Background track
    const track = this.add.rectangle(0, 0, sliderWidth, sliderHeight, 0x333333)
      .setOrigin(0, 0.5);
    container.add(track);

    // Fill bar
    const fill = this.add.rectangle(0, 0, sliderWidth * initialValue, sliderHeight, COLORS.PADDLE)
      .setOrigin(0, 0.5);
    container.add(fill);

    // Handle
    const handle = this.add.circle(sliderWidth * initialValue, 0, 12, 0xffffff)
      .setInteractive({ useHandCursor: true, draggable: true });
    container.add(handle);

    // Make the track clickable
    track.setInteractive({ useHandCursor: true });

    track.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      const localX = pointer.x - (GAME_WIDTH / 2 + x);
      const value = Phaser.Math.Clamp(localX / sliderWidth, 0, 1);
      handle.x = value * sliderWidth;
      fill.width = value * sliderWidth;
      onChange(value);
    });

    // Drag handling
    this.input.on('drag', (_pointer: Phaser.Input.Pointer, gameObject: Phaser.GameObjects.GameObject, dragX: number) => {
      if (gameObject === handle) {
        const value = Phaser.Math.Clamp(dragX / sliderWidth, 0, 1);
        handle.x = value * sliderWidth;
        fill.width = value * sliderWidth;
        onChange(value);
      }
    });

    return container;
  }
}
