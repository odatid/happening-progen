/* offline.html を作る（CSS/JS を1枚に結合）— 配布・検証用 */
const fs = require('fs');
const path = require('path');
const root = __dirname;
const html = fs.readFileSync(path.join(root,'index.html'),'utf8');
const css = fs.readFileSync(path.join(root,'assets/css/style.css'),'utf8');
const js = ['config','data','db','generate','app'].map(f=>fs.readFileSync(path.join(root,'assets/js/'+f+'.js'),'utf8')).join('\n\n');

let doc = html
  .replace('<link rel="stylesheet" href="assets/css/style.css">', '<style>\n'+css+'\n</style>')
  .replace(/<script src="assets\/js\/[a-z]+\.js"><\/script>\n?/g, '');
doc = doc.replace('</body>', '<script>\n'+js+'\n</script>\n</body>');
fs.writeFileSync(path.join(root,'offline.html'), doc);
console.log('offline.html', (doc.length/1024).toFixed(0)+'KB');
