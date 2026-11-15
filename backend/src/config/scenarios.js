// Durations are placeholders and needs: check them against Ready.gov with the team.
const SCENARIOS = {
  tornado: {
    label: 'Tornado', days: 3,
    needs: ['drinking_water', 'sanitation_water', 'food', 'first_aid', 'lighting', 'radio', 'shelter', 'sanitation']
  },
  winterStorm: {
    label: 'Winter Storm', days: 7,
    needs: ['drinking_water', 'sanitation_water', 'food', 'first_aid', 'lighting', 'radio', 'shelter', 'sanitation']
  },
  powerOutage: {
    label: 'Long-Term Power Outage', days: 14,
    needs: ['drinking_water', 'sanitation_water', 'food', 'first_aid', 'lighting', 'radio', 'power', 'shelter', 'sanitation']
  },
  flood: {
    label: 'Flood', days: 3,
    needs: ['drinking_water', 'sanitation_water', 'food', 'first_aid', 'lighting', 'radio', 'shelter', 'sanitation']
  }
  
};

module.exports = { SCENARIOS };