const fs = require('fs');
let code = fs.readFileSync('js/stories.js', 'utf8');

code = code.replace('avatar: "👦",\n    color: "#E2B842",', 'avatar: "👦",\n    png: "./sprites/conrad.png",\n    filter: "brightness(1.05) saturate(1.1)",\n    color: "#E2B842",');
code = code.replace('avatar: "⚔️",\n    color: "#4A6EAA",', 'avatar: "⚔️",\n    png: "./sprites/conrad.png",\n    filter: "hue-rotate(200deg) brightness(1.05) saturate(1.2)",\n    color: "#4A6EAA",');
code = code.replace('avatar: "🦊",\n    color: "#D9333F",', 'avatar: "🦊",\n    png: "./sprites/conrad.png",\n    filter: "hue-rotate(330deg) brightness(1.05) saturate(1.3)",\n    color: "#D9333F",');
code = code.replace('avatar: "🕸️",\n    color: "#7D53C6",', 'avatar: "🕸️",\n    png: "./sprites/conrad.png",\n    filter: "hue-rotate(255deg) brightness(0.95) saturate(1.25)",\n    color: "#7D53C6",');
code = code.replace('avatar: "🛡️",\n    color: "#2AA876",', 'avatar: "🛡️",\n    png: "./sprites/anastasia.png",\n    filter: "hue-rotate(110deg) brightness(1.02) saturate(1.15)",\n    color: "#2AA876",');

fs.writeFileSync('js/stories.js', code, 'utf8');
console.log("Successfully modified stories.js");
