// consumable: need = (perPersonPerDay x members + perPetPerDay x pets) x days
// essential:  need = minimum, however long the disaster lasts
// duration:   need = the scenario's days (the quantity is already in days of supply)
// members:    which household members a consumable is for (default: everyone)
// when:       only a need when this household field is above 0
// counts: which inventory resource types meet this need

const REQUIREMENTS = {
  drinking_water: {
    label: 'drinking water', kind: 'consumable', perPersonPerDay: 0.5,
    perPetPerDay: 0.25, // placeholder (about a quart per pet): check with the team
    unit: 'gallons', weight: 3, critical: true, counts: ['drink', 'water']
  },
  food: {
    label: 'food', kind: 'consumable', perPersonPerDay: 3,
    members: ['adults', 'children'], // infants are covered by infant_food
    unit: 'meals', weight: 3, critical: true, counts: ['meal']
  },
  infant_food: {
    label: 'infant formula or baby food', kind: 'duration', unit: 'days',
    weight: 2, critical: true, counts: ['infant_food'], when: 'infants'
  },
  pet_food: {
    label: 'pet food', kind: 'duration', unit: 'days',
    weight: 1, critical: false, counts: ['pet_food'], when: 'pets'
  },
  sanitation_water: {
    label: 'sanitation water', kind: 'consumable', perPersonPerDay: 0.5,
    unit: 'gallons', weight: 1, critical: false, counts: ['water']
  },
  first_aid: {
    label: 'first aid kit', kind: 'essential', minimum: 1,
    unit: 'pieces', weight: 2, critical: true, counts: ['first_aid_kit']
  },
  lighting: {
    label: 'flashlight', kind: 'essential', minimum: 1,
    unit: 'pieces', weight: 1, critical: false, counts: ['flashlight']
  },
  radio: {
    label: 'emergency radio', kind: 'essential', minimum: 1,
    unit: 'pieces', weight: 1, critical: false, counts: ['radio']
  },
  power: {
    label: 'battery pack', kind: 'essential', minimum: 1,
    unit: 'pieces', weight: 1, critical: false, counts: ['battery_pack']
  },
  medication: {
    label: 'medication', kind: 'duration', unit: 'days',
    weight: 2, critical: true, counts: ['medication']
  },
  shelter: {
    label: 'shelter or warmth supplies', kind: 'essential', minimum: 1,
    unit: 'pieces', weight: 1, critical: false, counts: ['shelter']
  },
  sanitation: {
    label: 'sanitation supplies', kind: 'essential', minimum: 1,
    unit: 'pieces', weight: 1, critical: false, counts: ['sanitation']
  }
};

module.exports = { REQUIREMENTS };