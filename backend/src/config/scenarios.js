// Durations are placeholders and needs: check them against Ready.gov with the team.
const SCENARIOS = {
  tornado: {
    label: 'Tornado', days: 3,
    needs: ['drinking_water', 'sanitation_water', 'food', 'first_aid', 'lighting', 'radio']
  },
  winterStorm: {
    label: 'Winter Storm', days: 7,
    needs: ['drinking_water', 'sanitation_water', 'food', 'first_aid', 'lighting', 'radio']
  },
  powerOutage: {
    label: 'Long-Term Power Outage', days: 14,
    needs: ['drinking_water', 'sanitation_water', 'food', 'first_aid', 'lighting', 'radio', 'power']
  },
  flood: {
    label: 'Flood', days: 3,
    needs: ['drinking_water', 'sanitation_water', 'food', 'first_aid', 'lighting', 'radio']
  }
};

module.exports = { SCENARIOS };