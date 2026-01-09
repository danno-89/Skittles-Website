const { glob } = require('glob');
const fs = require('fs');

const files = glob.sync('public/**/*.html');
console.log("Total files found:", files.length);

const filtered = files.filter(file => {
    try {
        const content = fs.readFileSync(file, 'utf-8');
        const isPage = /<html/i.test(content) || /<!DOCTYPE/i.test(content);
        console.log(`Checking ${file}: ${isPage ? 'INCLUDE' : 'EXCLUDE'}`);
        return isPage;
    } catch (e) {
        console.error(`Error reading ${file}:`, e);
        return false;
    }
});

console.log("Filtered files count:", filtered.length);
console.log("Included files:", filtered);
