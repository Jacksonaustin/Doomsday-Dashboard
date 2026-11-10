const { RESOURCE_TYPES } = require('../config/resourceTypes');
const { REQUIREMENTS } = require('../config/requirements');
const { SCENARIOS } = require('../config/scenarios');

function round(value){
    return Math.round(value*10)/10;
}

function totalsByResourceType(inventory, now){
    const totals = {}; 

    for( const item of inventory){
        
    }
}