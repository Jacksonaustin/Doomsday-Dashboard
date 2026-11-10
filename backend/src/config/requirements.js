// consumable: need = perPersonPerDay x people x days
// essential:  need = minimum, however long the disaster lasts
// counts: which inventory resource types meet this need
const REQUIREMENTS = {
  drinking_water: {
    label: 'drinking water', kind: 'consumable', perPersonPerDay: 0.5,
    unit: 'gallons', weight: 3, critical: true, counts: ['drink', 'water']
  },
  sanitation_water: {
    label: 'sanitation water', kind: 'consumable', perPersonPerDay: 0.5,
    unit: 'gallons', weight: 1, critical: false, counts: ['water']
  },
  food: {
    label: 'food', kind: 'consumable', perPersonPerDay: 3,
    unit: 'meals', weight: 3, critical: true, counts: ['meal']
  },
  first_aid: {
    label: 'first aid kit', kind: 'essential', minimum: 1,
    unit: 'kits', weight: 2, critical: true, counts: ['first_aid_kit']
  },
  lighting: {
    label: 'flashlight', kind: 'essential', minimum: 1,
    unit: 'items', weight: 1, critical: false, counts: ['flashlight']
  },
  radio: {
    label: 'emergency radio', kind: 'essential', minimum: 1,
    unit: 'items', weight: 1, critical: false, counts: ['radio']
  },
  power: {
    label: 'battery pack', kind: 'essential', minimum: 1,
    unit: 'items', weight: 1, critical: false, counts: ['battery_pack']
  }
};

module.exports = { REQUIREMENTS };