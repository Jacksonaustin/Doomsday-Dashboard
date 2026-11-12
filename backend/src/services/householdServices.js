const Household = require('../models/household');
const httpError = require('../utils/httpError');

const COUNT_FIELDS = ['adults', 'children', 'infants', 'pets'];
const MAX_COUNT = 50;

function validateHousehold(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw httpError(400, 'Household details are required');
  }

  const household = {};

  for (const field of COUNT_FIELDS) {
    const value = input[field] ?? 0;

    if (!Number.isInteger(value) || value < 0 || value > MAX_COUNT) {
      throw httpError(400, `${field} must be a whole number from 0 to ${MAX_COUNT}`);
    }

    household[field] = value;
  }

  // The gap engine needs at least one person to work out needs.
  if (household.adults + household.children + household.infants < 1) {
    throw httpError(400, 'A household must include at least one person');
  }

  return household;
}

function toPublicHousehold(household) {
  return {
    adults: household.adults,
    children: household.children,
    infants: household.infants,
    pets: household.pets,
    updatedAt: household.updatedAt
  };
}

async function getHousehold(userId) {
  const household = await Household.findOne({ userId }).lean();
  return household ? toPublicHousehold(household) : null;
}

async function saveHousehold(userId, input) {
  const changes = validateHousehold(input);

  // One household per user: update it if it exists, create it if it doesn't.
  const upsert = () => Household.findOneAndUpdate(
    { userId },
    { $set: changes },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
  ).lean();

  try {
    return toPublicHousehold(await upsert());
  } catch (error) {
    // Two saves at the same moment can both try to create it. The unique index
    // rejects the second, which then exists, so retrying updates it instead.
    if (error.code === 11000) {
      return toPublicHousehold(await upsert());
    }
    throw error;
  }
}

module.exports = { getHousehold, saveHousehold };
