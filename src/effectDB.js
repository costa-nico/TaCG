export const EffectLibrary = {
    
        ADD_MANA: (scene, target, value, source) => {
            if (!target || typeof target.mana !== 'number') return;
            target.mana = Math.min(10, target.mana + value);
            if (scene && (target === scene.player || target === scene.enemy)) {
                scene.updateManaText && scene.updateManaText();
            }
            console.log(`${target.role}이 ${source.owner}의 ${source.name} 효과로 ${value} 현재 마나를 얻었습니다. 현재 마나: ${target.mana}`);
        },

        ADD_HP: (scene, target, value, source) => {
            target.hp += value;
            if (target.obj && typeof target.obj.updateUI === 'function') {
                target.obj.updateUI();
            }
            console.log(`${target.name}이 ${source.owner}의 ${source.name} 효과로 ${value} HP를 얻었습니다. 현재 HP: ${target.hp}`);
        },
        DOUBLE_HP: (scene, target, value, source) => {
            target.hp *= 2;
            target.obj.updateUI();
            console.log(`${target.name}이 ${source.owner}의 ${source.name} 효과로 HP가 두 배가 되었습니다. 현재 HP: ${target.hp}`);
        }
};