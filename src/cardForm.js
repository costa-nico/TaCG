import Phaser from 'phaser';

export default class Card extends Phaser.GameObjects.Container {
    constructor(scene, x, y, info, uiScale = 1) {
        super(scene, x, y);
        this._scene = scene;
        this.info = info;
        this._uiScale = uiScale;

        scene.add.existing(this);
        this.render(this._uiScale);
    }

    render(uiScale) {
        // remove any existing children first
        this.removeAll(true);

        const baseWidth = Math.round(100 * uiScale);
        const baseHeight = Math.round(150 * uiScale);
        const stroke = Math.max(1, Math.round(2 * uiScale));

        // Determine border color: yellow if attackable, else white
        let borderColor = 0xffffff;
        if (this.info && typeof this.info.attackableTimes === 'number' && this.info.attackableTimes > 0) {
            borderColor = 0x66e0ff; // blue
        }

        const base = this._scene.add.rectangle(0, 0, baseWidth, baseHeight, 0xaaaaaa).setStrokeStyle(stroke, borderColor);

        const textStyle = { fontFamily: 'NanumBarunGothic, Nanum Gothic, sans-serif', fontWeight: '700' };
        const atkText = this._scene.add.text(Math.round(-35 * uiScale), Math.round(36 * uiScale), this.info.atk, { ...textStyle, fontSize: `${Math.round(20 * uiScale)}px`, color: '#fff' });
        const hpText = this._scene.add.text(Math.round(20 * uiScale), Math.round(36 * uiScale), this.info.hp, { ...textStyle, fontSize: `${Math.round(20 * uiScale)}px`, color: '#ff0000' });
        const costText = this._scene.add.text(Math.round(30 * uiScale), Math.round(-70 * uiScale), this.info.cost, { ...textStyle, fontSize: `${Math.round(20 * uiScale)}px`, color: '#00f' });
        const nameText = this._scene.add.text(Math.round(-32 * uiScale), Math.round(-42 * uiScale), this.info.name, { ...textStyle, fontSize: `${Math.round(20 * uiScale)}px`, color: '#000' });

        this.add([base, atkText, hpText, costText, nameText]);

        this.setSize(baseWidth, baseHeight);
        this.setInteractive();
        this._scene.input.setDraggable(this);
    }

    setUiScale(newScale) {
        if (!newScale || this._uiScale === newScale) return;
        this._uiScale = newScale;
        this.render(this._uiScale);
    }

    // 호출 시 현재 데이터로 UI를 다시 그립니다.
    updateUI() {
        this.render(this._uiScale);
    }
}