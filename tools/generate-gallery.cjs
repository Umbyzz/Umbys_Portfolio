const fs = require('node:fs');
const path = require('node:path');
const rootDefault = path.resolve(__dirname, '..');
const normalize = value => value.toLowerCase().replace(/[^a-z0-9]/g, '');
const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const imageURL = value => value.split('/').map(encodeURIComponent).join('/');
function formatDescription(text) {
    const pattern = /\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)/g;
    let html = '', last = 0;
    for (const match of text.matchAll(pattern)) {
        html += escape(text.slice(last, match.index));
        let url;
        try { url = new URL(match[2]); } catch {}
        html += url && ['https:', 'http:'].includes(url.protocol)
            ? '<a href="' + escape(url.href) + '" target="_blank" rel="noopener noreferrer">' + escape(match[1]) + '</a>'
            : escape(match[0]);
        last = match.index + match[0].length;
    }
    return html + escape(text.slice(last));
}
function cover(src, title) {
    return /\.mp4$/i.test(src)
        ? '<video src="' + escape(src) + '" muted playsinline preload="metadata" aria-label="' + escape(title) + ' video"></video><span class="video-badge">▶ Video</span>'
        : '<img src="' + escape(src) + '" alt="' + escape(title) + ' model" loading="lazy">';
}
function walk(folder, relative = '') {
    if (!fs.existsSync(folder)) return [];
    return fs.readdirSync(folder, {withFileTypes:true}).flatMap(entry => {
        const name = relative + entry.name;
        if (entry.isDirectory()) return walk(path.join(folder,entry.name), name + '/');
        return entry.isFile() && /\.(jpe?g|png|gif|webp|avif|mp4)$/i.test(name) ? [name] : [];
    });
}
// Inspect MP4 track handlers without decoding or loading the video into memory.
function hasAudio(file) {
    const fd = fs.openSync(file, 'r');
    const size = fs.fstatSync(fd).size;
    function scan(start, end) {
        for (let offset = start; offset + 8 <= end;) {
            const header = Buffer.alloc(16);
            fs.readSync(fd, header, 0, Math.min(16, end-offset), offset);
            let length = header.readUInt32BE(0), bytes = 8;
            const type = header.toString('ascii',4,8);
            if (length === 1) { if(offset+16>end) return false; length=Number(header.readBigUInt64BE(8)); bytes=16; }
            if (length === 0) length=end-offset;
            if (!Number.isSafeInteger(length) || length < bytes || offset+length>end) return false;
            if (type === 'hdlr' && length >= bytes+12) {
                const handler=Buffer.alloc(12); fs.readSync(fd,handler,0,12,offset+bytes);
                if(handler.toString('ascii',8,12)==='soun') return true;
            }
            if (['moov','trak','mdia'].includes(type) && scan(offset+bytes,offset+length)) return true;
            offset += length;
        }
        return false;
    }
    try { return scan(0,size); } finally { fs.closeSync(fd); }
}
function buildContributions(root) {
    const base = path.join(root, 'images/contributions');
    if (!fs.existsSync(base)) return null;
    const entries = fs.readdirSync(base, {withFileTypes:true}).filter(x => x.isDirectory()).sort((a,b)=>a.name.localeCompare(b.name));
    const projects = entries.map(entry => {
        const folder = path.join(base,entry.name);
        const read = name => fs.existsSync(path.join(folder,name)) ? fs.readFileSync(path.join(folder,name),'utf8').replace(/^\uFEFF/,'').trim() : '';
        const images = fs.readdirSync(folder).filter(name => /\.(png|jpe?g|gif|webp|avif)$/i.test(name)).sort((a,b)=>a.localeCompare(b,undefined,{numeric:true}));
        const url = read('url.txt');
        if(url) { let parsed; try { parsed=new URL(url); } catch {} if(!parsed || parsed.protocol!=='https:') throw Error('Use an HTTPS link in '+folder+'/url.txt'); }
        return {title:entry.name,description:read('description.txt'),tag:read('tag.txt'),url,image:images.length ? imageURL('images/contributions/'+entry.name+'/'+images[0]) : ''};
    });
    return 'window.CONTRIBUTIONS = ' + JSON.stringify(projects,null,2) + ';\n';
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
            if (!groups.has(key)) groups.set(key,{category, detail, name:rawName, files:[], descriptionFiles:new Set()});
            const imageFolder = path.join(imageRoot,dir.name,path.posix.dirname(relative));
            const descriptionNames = [rawName, ...(detail?.aliases || [])].map(name => normalize(name));
            for (const entry of fs.readdirSync(imageFolder,{withFileTypes:true})) {
                if (!entry.isFile() || !/\.txt$/i.test(entry.name)) continue;
                const name = entry.name.replace(/\.txt$/i,'');
                if (descriptionNames.includes(normalize(name)) || (path.posix.dirname(relative) !== '.' && name.toLowerCase() === 'description')) {
                    groups.get(key).descriptionFiles.add(path.join(imageFolder,entry.name));
                }
            }
            groups.get(key).files.push({src:`images/${dir.name}/${relative}`, number:match ? Number(match[2]) : null});
        }
    }
    for (const group of groups.values()) {
        // Numbered sets replace the old unnumbered cover; no duplicate cover.
        let files = group.files.some(file => file.number !== null) ? group.files.filter(file => file.number !== null) : group.files;
        files.sort((a,b) => (a.number ?? 0) - (b.number ?? 0) || a.src.localeCompare(b.src));
        const title = group.detail?.title || group.name.replace(/[_-]+/g,' ').replace(/([a-z])([A-Z])/g,'$1 $2').replace(/^./,c => c.toUpperCase());
        const descriptions = [...group.descriptionFiles].sort();
        if (descriptions.length > 1) throw new Error(`More than one description file for ${title}: ${descriptions.join(', ')}. Keep one description per model.`);
        const description = descriptions.length ? fs.readFileSync(descriptions[0],'utf8').replace(/^\uFEFF/,'').trim() : null;
        const caption = description === null ? group.detail?.caption || '' : formatDescription(description);
        categories[group.category].push({title, files:files.map(file => imageURL(file.src)), detail:group.detail, caption});
    }
    for (const models of Object.values(categories)) models.sort((a,b) => (a.detail?.order ?? 9999) - (b.detail?.order ?? 9999) || a.title.localeCompare(b.title,undefined,{numeric:true}));
    let html = fs.readFileSync(path.join(root,'index.html'),'utf8');
    for (const [category, models] of Object.entries(categories)) {
        const cards = models.map((model,index) => `            <article class="model-card" data-audio="${escape(JSON.stringify(model.files.filter(src => /\.mp4$/i.test(src) && hasAudio(path.join(root, decodeURIComponent(src))))))}" data-images="${escape(JSON.stringify(model.files.slice(1)))}">
                <div class="model-frame">${cover(model.files[0], model.title)}</div>
                <div class="model-caption">
                    <img class="model-label-dog" src="images/more/uxors-dog.png" alt="" aria-hidden="true" width="24" height="21" loading="lazy">
                    <strong>${escape(model.title)}</strong>
                    <span>${model.caption}</span>
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
    const projects = buildContributions(root);
    if (projects !== null) fs.writeFileSync(path.join(root,'contributions.js'), projects);
    console.log(Object.entries(categories).map(([name,items]) => `${name}: ${items.length}`).join(', '));
}
module.exports = {buildGallery, formatDescription, buildContributions};
