import Phaser from 'phaser';

export default class MainScene extends Phaser.Scene {
    constructor() {
        super('MainScene');
    }

    create() {
        const cam = this.cameras.main;
        const centerX = cam.centerX;
        const centerY = cam.centerY;

        this.add.text(centerX, centerY, 'Main Scene - Click to start battle', {
            fontFamily: 'NanumBarunGothic, Nanum Gothic, sans-serif',
            fontSize: '48px',
            color: '#1a1a1a'
        }).setOrigin(0.5);

        this.input.once('pointerdown', () => {
            this.scene.start('BattleScene');
        });
    }
}