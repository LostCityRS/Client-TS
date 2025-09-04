import fs from 'fs';
import path from 'path';

const define = {
    'process.env.SECURE_ORIGIN': JSON.stringify(process.env.SECURE_ORIGIN ?? 'false'),
    // original key, used 2003-2010
    'process.env.LOGIN_RSAE': JSON.stringify(process.env.LOGIN_RSAE ?? '58778699976184461502525193738213253649000149147835990136706041084440742975821'),
    'process.env.LOGIN_RSAN': JSON.stringify(process.env.LOGIN_RSAN ?? '7162900525229798032761816791230527296329313291232324290237849263501208207972894053929065636522363163621000728841182238772712427862772219676577293600221789')
};

// ----

type BunOutput = {
    source: string;
    sourcemap: string;
}

async function bunBuild(entry: string, external: string[] = [], minify = true, drop: string[] = []): Promise<BunOutput> {
    const build = await Bun.build({
        entrypoints: [entry],
        sourcemap: 'external',
        define,
        external,
        minify,
        drop,
    });

    if (!build.success) {
        build.logs.forEach(x => console.log(x));
        process.exit(1);
    }

    return {
        source: await build.outputs[0].text(),
        sourcemap: build.outputs[0].sourcemap ? await build.outputs[0].sourcemap.text() : ''
    };
}

// todo: workaround due to a bun bug https://github.com/oven-sh/bun/issues/16509: not remapping external
function replaceDepsUrl(source: string) {
    return source.replaceAll('#3rdparty', '.');
}

// ----

if (!fs.existsSync('out')) {
    fs.mkdirSync('out');
}

fs.copyFileSync('src/3rdparty/bzip2-wasm/bzip2.wasm', 'out/bzip2.wasm');
fs.copyFileSync('src/3rdparty/tinymidipcm/tinymidipcm.wasm', 'out/tinymidipcm.wasm');

const args = process.argv.slice(2);
const prod = args[0] !== 'dev';

const entrypoints = [
    'src/client/Client.ts',
    'src/mapview/MapView.ts'
];

const deps = await bunBuild('./src/3rdparty/deps.js', [], true, ['console']);
fs.writeFileSync('out/deps.js', deps.source);

for (const file of entrypoints) {
    const output = path.basename(file).replace('.ts', '.js').toLowerCase();

    const script = await bunBuild(file, ['#3rdparty/*'], prod, prod ? ['console'] : []);

    if (script) {
        fs.writeFileSync('out/' + output, replaceDepsUrl(script.source));
    }
}
