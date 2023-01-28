var ghpages = require('gh-pages');

ghpages.publish('public', () => {
    console.log('Published to gh-pages');
});
