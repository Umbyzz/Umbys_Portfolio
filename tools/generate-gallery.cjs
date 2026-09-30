const fs = require('node:fs');
const path = require('node:path');
const rootDefault = path.resolve(__dirname, '..');
const normalize = value => value.toLowerCase().replace(/[^a-z0-9]/g, '');
const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const imageURL = value => value.split('/').map(encodeURIComponent).join('/');
function walk(folder, relative = '') {
    if (!fs.existsSync(folder)) return [];
    return fs.readdirSync(folder, {withFileTypes:true}).flatMap(entry => {
        const name = relative + entry.name;
        if (entry.isDirectory()) return walk(path.join(folder,entry.name), name + '/');
        return entry.isFile() && /\.(jpe?g|png|gif|webp|avif)$/i.test(name) ? [name] : [];
    });
}
function buildGallery(root = rootDefault) {
    const metadata = JSON.parse(fs.readFileSync(path.join(root,'tools/model-details.json'),'utf8'));
    const aliases = new Map(metadata.flatMap(item => item.aliases.map(alias => [normalize(alias), item])));
    const categories = {weapons:[], objects:[], characters:[]};
    const folders = {weapons:'weapons', object:'objects', objects:'objects', misc:'objects', fullbody:'characters', characters:'characters'};
    const imageRoot = path.join(root,'images');
    const groups = new Map();
    for (const dir of fs.existsSync(imageRoot) ? fs.readdirSync(imageRoot,{withFileTypes:true}) : []) {
        const category = folders[dir.name.toLowerCase()];
        if (!dir.isDirectory() || !category) continue;
        for (const relative of walk(path.join(imageRoot,dir.name)).sort()) {
            const stem = path.posix.basename(relative).replace(/\.[^.]+$/, '');
            const match = stem.match(/^(.*?)[ _-]?(\d+)$/);
            const rawName = (match ? match[1] : stem) || path.posix.basename(path.posix.dirname(relative));
            const detail = aliases.get(normalize(rawName));
            const key = category + ':' + (detail ? detail.aliases[0] : normalize(path.posix.dirname(relative) + '/' + rawName));
            if (!groups.has(key)) groups.set(key,{category, detail, name:rawName, files:[]});
            groups.get(key).files.push({src:`images/${dir.name}/${relative}`, number:match ? Number(match[2]) : null});
        }
    }
    for (const group of groups.values()) {
        // Numbered sets replace the old unnumbered cover; no duplicate cover.
        let files = group.files.some(file => file.number !== null) ? group.files.filter(file => file.number !== null) : group.files;
        files.sort((a,b) => (a.number ?? 0) - (b.number ?? 0) || a.src.localeCompare(b.src));
        const title = group.detail?.title || group.name.replace(/[_-]+/g,' ').replace(/([a-z])([A-Z])/g,'$1 $2').replace(/^./,c => c.toUpperCase());
        categories[group.category].push({title, files:files.map(file => imageURL(file.src)), detail:group.detail});
    }
    for (const models of Object.values(categories)) models.sort((a,b) => (a.detail?.order ?? 9999) - (b.detail?.order ?? 9999) || a.title.localeCompare(b.title,undefined,{numeric:true}));
    let html = fs.readFileSync(path.join(root,'index.html'),'utf8');
    for (const [category, models] of Object.entries(categories)) {
        const cards = models.map((model,index) => `            <article class="model-card" data-images="${escape(JSON.stringify(model.files.slice(1)))}">
                <div class="model-frame"><img src="${escape(model.files[0])}" alt="${escape(model.title)} model" loading="lazy"></div>
                <div class="model-caption">
                    <span class="plate-id">${escape(model.detail?.plate || category.slice(0,3).toUpperCase() + '-' + String(index+1).padStart(2,'0'))}</span>
                    <strong>${escape(model.title)}</strong>
                    <span>${model.detail?.caption || ''}</span>
                </div>
            </article>`).join('\n');
        const pattern = new RegExp('(<section id="' + category + '"[\\s\\S]*?<div class="model-grid">)[\\s\\S]*?(</section>)');
        if (!pattern.test(html)) throw new Error('Missing gallery section: ' + category);
        html = html.replace(pattern, (_,opening,ending) => opening + '\n' + cards + '\n        </div>\n    ' + ending);
    }
    return {html,categories};
}
if (require.main === module) {
    const root = process.argv[2] ? path.resolve(process.argv[2]) : rootDefault;
    const {html,categories} = buildGallery(root);
    fs.writeFileSync(path.join(root,'index.html'), html);
    console.log(Object.entries(categories).map(([name,items]) => `${name}: ${items.length}`).join(', '));
}
module.exports = {buildGallery};
