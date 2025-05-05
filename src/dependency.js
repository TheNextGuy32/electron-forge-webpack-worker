const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const doAThing = async (source) => {
    const checkinPath = path.join("C:\\Users\\olive\\Documents\\git\\notes", "checkin.md")
    const file = fs.readFileSync(checkinPath, 'utf8');
    console.log(file);
    console.log(`do a thing using ${source}`);
}

module.exports = { doAThing };
