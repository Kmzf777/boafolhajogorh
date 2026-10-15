// Embute <script src> e <link rel=stylesheet> locais num único HTML. Uso: node src/inline.js entrada.html saida.html
const fs = require('fs'), path = require('path');
const [, , inp, out] = process.argv; const dir = path.dirname(inp);
let html = fs.readFileSync(inp, 'utf8');
html = html.replace(/<script src="([^"]+)"><\/script>/g, (m, f) => '<script>\n' + fs.readFileSync(path.join(dir, f), 'utf8').replace(/<\/script/gi, '<\/script') + '\n</script>');
html = html.replace(/<link rel="stylesheet" href="([^"]+)">/g, (m, f) => '<style>\n' + fs.readFileSync(path.join(dir, f), 'utf8') + '\n</style>');
fs.writeFileSync(out, html); console.log(out, (html.length / 1024).toFixed(0) + ' KB');
