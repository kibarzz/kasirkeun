const fs = require('fs');
const path = require('path');

const directoryPath = path.join(__dirname, 'src');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(function(file) {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { 
      results = results.concat(walk(file));
    } else { 
      if (file.endsWith('.tsx')) {
        results.push(file);
      }
    }
  });
  return results;
}

const files = walk(directoryPath);

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  
  // Replace bg-slate-900 with bg-slate-50 dark:bg-slate-900
  content = content.replace(/bg-slate-900/g, 'bg-slate-50 dark:bg-slate-900');
  
  // Replace bg-slate-800 with bg-white dark:bg-slate-800
  content = content.replace(/bg-slate-800/g, 'bg-white dark:bg-slate-800');
  
  // Replace text-white with text-slate-900 dark:text-white
  // But be careful not to replace text-white/60 or text-white/40 here, we'll do them separately
  content = content.replace(/text-white\b(?!\/)/g, 'text-slate-900 dark:text-white');
  
  // Replace text-white/60 with text-slate-500 dark:text-white/60
  content = content.replace(/text-white\/60/g, 'text-slate-500 dark:text-white/60');
  
  // Replace text-white/40 with text-slate-400 dark:text-white/40
  content = content.replace(/text-white\/40/g, 'text-slate-400 dark:text-white/40');
  
  // Replace text-white/20 with text-slate-300 dark:text-white/20
  content = content.replace(/text-white\/20/g, 'text-slate-300 dark:text-white/20');
  
  // Replace text-white/80 with text-slate-600 dark:text-white/80
  content = content.replace(/text-white\/80/g, 'text-slate-600 dark:text-white/80');
  
  // Replace text-white/70 with text-slate-600 dark:text-white/70
  content = content.replace(/text-white\/70/g, 'text-slate-600 dark:text-white/70');
  
  // Replace text-white/50 with text-slate-500 dark:text-white/50
  content = content.replace(/text-white\/50/g, 'text-slate-500 dark:text-white/50');
  
  // Replace text-white/30 with text-slate-400 dark:text-white/30
  content = content.replace(/text-white\/30/g, 'text-slate-400 dark:text-white/30');

  // Replace bg-white/5 with bg-black/5 dark:bg-white/5
  content = content.replace(/bg-white\/5\b/g, 'bg-black/5 dark:bg-white/5');
  
  // Replace bg-white/10 with bg-black/10 dark:bg-white/10
  content = content.replace(/bg-white\/10\b/g, 'bg-black/10 dark:bg-white/10');
  
  // Replace bg-white/20 with bg-black/20 dark:bg-white/20
  content = content.replace(/bg-white\/20\b/g, 'bg-black/20 dark:bg-white/20');
  
  // Replace border-white/5 with border-black/5 dark:border-white/5
  content = content.replace(/border-white\/5\b/g, 'border-black/5 dark:border-white/5');
  
  // Replace border-white/10 with border-black/10 dark:border-white/10
  content = content.replace(/border-white\/10\b/g, 'border-black/10 dark:border-white/10');
  
  // Replace border-white/20 with border-black/20 dark:border-white/20
  content = content.replace(/border-white\/20\b/g, 'border-black/20 dark:border-white/20');
  
  // Replace border-white/30 with border-black/30 dark:border-white/30
  content = content.replace(/border-white\/30\b/g, 'border-black/30 dark:border-white/30');

  // Fix buttons that should keep white text
  // e.g. bg-indigo-500 text-slate-900 dark:text-white -> bg-indigo-500 text-white
  content = content.replace(/bg-([a-z]+)-500(.*?)text-slate-900 dark:text-white/g, 'bg-$1-500$2text-white');
  content = content.replace(/bg-([a-z]+)-600(.*?)text-slate-900 dark:text-white/g, 'bg-$1-600$2text-white');
  content = content.replace(/bg-([a-z]+)-400(.*?)text-slate-900 dark:text-white/g, 'bg-$1-400$2text-white');
  
  // Also fix gradients
  content = content.replace(/from-([a-z]+)-400 to-([a-z]+)-600(.*?)text-slate-900 dark:text-white/g, 'from-$1-400 to-$2-600$3text-white');

  fs.writeFileSync(file, content, 'utf8');
});

console.log('Replacement complete');
