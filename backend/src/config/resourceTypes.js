// Each unit's number converts it into the resource type's base unit.
// Unit names match the inventory page's dropdown (gallons, liters, fluid_ounces, pieces).
const LIQUID_UNITS = { gallons: 1, liters: 0.264172, fluid_ounces: 1 / 128 };
const COUNTED = { pieces: 1 };

const RESOURCE_TYPES = {
  water: { category: 'liquid', baseUnit: 'gallons', units: LIQUID_UNITS },
  drink: { category: 'liquid', baseUnit: 'gallons', units: LIQUID_UNITS },
  meal: { category: 'food', baseUnit: 'meals', units: { meals: 1 } },
  first_aid_kit: { category: 'medical', baseUnit: 'pieces', units: COUNTED },
  medication: { category: 'medical', baseUnit: 'days', units: { days: 1 } },
  flashlight: { category: 'power', baseUnit: 'pieces', units: COUNTED },
  battery_pack: { category: 'power', baseUnit: 'pieces', units: COUNTED },
  radio: { category: 'tools', baseUnit: 'pieces', units: COUNTED },
  shelter: { category: 'shelter', baseUnit: 'pieces', units: COUNTED },
  sanitation: { category: 'hygiene', baseUnit: 'pieces', units: COUNTED },
  other: { category: 'other', baseUnit: 'pieces', units: COUNTED }
};

module.exports = { RESOURCE_TYPES };
