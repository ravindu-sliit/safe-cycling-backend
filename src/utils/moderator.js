const Filter = require('bad-words');
const filter = new Filter();

//add custom Sinhala/Tamil slang words if you want to be extra thorough
// filter.addWords('customBadWord1', 'customBadWord2');

const assertCleanContent = (text, label) => {
    if (!text) return;
    
    if (filter.isProfane(text)) {
        const err = new Error(`Your ${label} contains inappropriate language. Please keep the community friendly!`);
        err.statusCode = 400;
        throw err;
    }
};

module.exports = { assertCleanContent };