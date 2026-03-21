export const cardList = [
    { 
        id: 0, 
        name: "허수아비", 
        cost: 1, 
        atk: 1, 
        hp: 1, 
        texture: "scarecrow",
        keywords: [], 
        abilities: {
        }
    },
    { 
        id: 1, 
        name: "돼지", 
        cost: 1, 
        atk: 0, 
        hp: 1, 
        texture: "pig",
        keywords: [], 
        abilities: {
            onTurnEnd: { ID: "ADD_HP", target: "self", amount: 1 },
        }
    },
    { 
        id: 2, 
        name: "농부", 
        cost: 0, 
        atk: 1, 
        hp: 2, 
        texture: "farmer",
        keywords: [],
        abilities: {
            onTurnStart: { ID: "ADD_MANA", target: "myMaster", amount: 1 }
        }
    },
    {
        id: 3,
        name: "곰팡이",
        cost: 2,
        atk: 1,
        hp: 2,
        texture: "mold",
        keywords: [],
        abilities: {
            onSummon: { ID: "DOUBLE_HP", target: "self", amount: null }
        }
    }
];

/*
            onSummon: null,
            onAttack: null,
            onDeath: null,
            onTurnStart: null,
            onTurnEnd: null,
            onDamage: null,
*/