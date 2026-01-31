import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS } from '../config/Constants';
import { AudioManager } from '../systems/AudioManager';

export class SettingsScene extends Phaser.Scene {
  private audioManager!: AudioManager;
  private muteText!: Phaser.GameObjects.Text;
  private returnTo: string = 'MenuScene';

  constructor() {
    super('SettingsScene');
  }

  init(data: { returnTo?: string }): void {
    this.returnTo = data?.returnTo || 'MenuScene';
  }

  create(): void {
    this.audioManager = AudioManager.getInstance();

    // When opened from PauseScene, bring to top so it renders above game scenes
    if (this.returnTo === 'PauseScene') {
      this.scene.bringToTop();
    }

    // Background
    this.add.rectangle(
      GAME_WIDTH / 2,
      GAME_HEIGHT / 2,
      GAME_WIDTH,
      GAME_HEIGHT,
      0x1a1a2e
    );

    // Container for all elements
    const container = this.add.container(GAME_WIDTH / 2, 0);

    // Title
    const title = this.add.text(0, 100, 'SETTINGS', {
      font: 'bold 48px Arial',
      color: '#ffffff',
    }).setOrigin(0.5);
    container.add(title);

    // Audio section header
    const audioHeader = this.add.text(0, 180, 'Audio', {
      font: 'bold 24px Arial',
      color: '#a78bfa',
    }).setOrigin(0.5);
    container.add(audioHeader);

    // Music volume slider
    const musicLabel = this.add.text(-120, 240, 'Music:', {
      font: '20px Arial',
      color: '#ffffff',
    }).setOrigin(0, 0.5);
    container.add(musicLabel);

    const musicSlider = this.createVolumeSlider(
      20, 240,
      this.audioManager.getMusicVolume(),
      (value) => this.audioManager.setMusicVolume(value)
    );
    container.add(musicSlider);

    // SFX volume slider
    const sfxLabel = this.add.text(-120, 300, 'SFX:', {
      font: '20px Arial',
      color: '#ffffff',
    }).setOrigin(0, 0.5);
    container.add(sfxLabel);

    const sfxSlider = this.createVolumeSlider(
      20, 300,
      this.audioManager.getSfxVolume(),
      (value) => this.audioManager.setSfxVolume(value)
    );
    container.add(sfxSlider);

    // Mute toggle
    const muteLabel = this.add.text(-120, 360, 'Sound:', {
      font: '20px Arial',
      color: '#ffffff',
    }).setOrigin(0, 0.5);
    container.add(muteLabel);

    const muteButton = this.add.rectangle(60, 360, 80, 40, 0x333333)
      .setInteractive({ useHandCursor: true });
    container.add(muteButton);

    this.muteText = this.add.text(60, 360, this.audioManager.isMuted() ? 'OFF' : 'ON', {
      font: 'bold 18px Arial',
      color: this.audioManager.isMuted() ? '#ff6b6b' : '#4ade80',
    }).setOrigin(0.5);
    container.add(this.muteText);

    muteButton.on('pointerover', () => muteButton.setFillStyle(0x444444));
    muteButton.on('pointerout', () => muteButton.setFillStyle(0x333333));
    muteButton.on('pointerdown', () => {
      const muted = this.audioManager.toggleMute();
      this.muteText.setText(muted ? 'OFF' : 'ON');
      this.muteText.setColor(muted ? '#ff6b6b' : '#4ade80');
    });

    // Back button
    const backButton = this.createButton(0, 480, 'BACK', 0x666666, () => {
      if (this.returnTo === 'PauseScene') {
        // Return to pause menu overlay (game remains paused)
        this.scene.stop();
        this.scene.launch('PauseScene');
      } else {
        this.scene.start('MenuScene');
      }
    });
    container.add(backButton);

    // Animate in
    container.setAlpha(0);
    this.tweens.add({
      targets: container,
      alpha: 1,
      duration: 200,
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

    const bg = this.add.rectangle(0, 0, 200, 50, color)
      .setInteractive({ useHandCursor: true });
    buttonContainer.add(bg);

    const buttonText = this.add.text(0, 0, text, {
      font: 'bold 20px Arial',
      color: '#ffffff',
    }).setOrigin(0.5);
    buttonContainer.add(buttonText);

    bg.on('pointerover', () => buttonContainer.setScale(1.05));
    bg.on('pointerout', () => buttonContainer.setScale(1));
    bg.on('pointerdown', onClick);

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
