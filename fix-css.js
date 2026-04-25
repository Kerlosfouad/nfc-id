const fs = require('fs');
let c = fs.readFileSync('app/globals.css', 'utf8');
const badStart = c.indexOf('/ *   C u s t o m');
if (badStart !== -1) {
  c = c.substring(0, badStart);
}
c += `
/* Custom Scrollbar */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}
::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.02);
  border-radius: 10px;
}
::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 10px;
}
::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.2);
}
`;
fs.writeFileSync('app/globals.css', c);
console.log('Fixed CSS');
