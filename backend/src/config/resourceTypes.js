// Each unit's number converts it into the resource type's base unit.
const LIQUID_UNITS = { gallons: 1, liters: 0.264172, fl_oz: 1 / 128 };

const RESOURCE_TYPES = {
  water: { category: 'liquid', baseUnit: 'gallons', units: LIQUID_UNITS },
  drink: { category: 'liquid', baseUnit: 'gallons', units: LIQUID_UNITS },
  meal: { category: 'food', baseUnit: 'meals', units: { meals: 1 } },
  first_aid_kit: { category: 'medical', baseUnit: 'kits', units: { kits: 1 } },
  medication: { category: 'medical', baseUnit: 'days', units: { days: 1 } },
  flashlight: { category: 'power', baseUnit: 'items', units: { items: 1 } },
  battery_pack: { category: 'power', baseUnit: 'items', units: { items: 1 } },
  radio: { category: 'tools', baseUnit: 'items', units: { items: 1 } },
  shelter: { category: 'shelter', baseUnit: 'items', units: { items: 1 } },
  sanitation: { category: 'hygiene', baseUnit: 'items', units: { items: 1 } },
  other: { category: 'other', baseUnit: 'items', units: { items: 1 } }
};

module.exports = { RESOURCE_TYPES };