'use strict';

const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = path.join(__dirname, '..', 'test-data');

// ---------------------------------------------------------------------------
// Movie data
// ---------------------------------------------------------------------------

const movies = [
  // Classics
  { title: 'The Godfather', year: 1972 },
  { title: 'Blade Runner', year: 1982 },
  { title: 'Apocalypse Now', year: 1979 },
  { title: 'Schindler\'s List', year: 1993 },
  { title: 'Goodfellas', year: 1990 },
  { title: 'The Silence of the Lambs', year: 1991 },
  { title: 'Pulp Fiction', year: 1994 },
  { title: '2001 A Space Odyssey', year: 1968 },
  { title: 'Chinatown', year: 1974 },
  { title: 'Taxi Driver', year: 1976 },
  // Modern blockbusters
  { title: 'Dune', year: 2021 },
  { title: 'Dune Part Two', year: 2024 },
  { title: 'Oppenheimer', year: 2023 },
  { title: 'The Batman', year: 2022 },
  { title: 'Top Gun Maverick', year: 2022 },
  { title: 'Everything Everywhere All at Once', year: 2022 },
  { title: 'Avatar The Way of Water', year: 2022 },
  { title: 'Mission Impossible Dead Reckoning', year: 2023 },
  { title: 'Killers of the Flower Moon', year: 2023 },
  { title: 'Poor Things', year: 2023 },
  // Indie / foreign
  { title: 'Parasite', year: 2019 },
  { title: 'Drive', year: 2011 },
  { title: 'Whiplash', year: 2014 },
  { title: 'Moon', year: 2009 },
  { title: 'Ex Machina', year: 2014 },
  { title: 'A Separation', year: 2011 },
  { title: 'The Hunt', year: 2012 },
  { title: 'Oldboy', year: 2003 },
  { title: 'Pan\'s Labyrinth', year: 2006 },
  { title: 'Amelie', year: 2001 },
  // Sci-fi / action
  { title: 'Interstellar', year: 2014 },
  { title: 'Arrival', year: 2016 },
  { title: 'Mad Max Fury Road', year: 2015 },
  { title: 'The Matrix', year: 1999 },
  { title: 'Inception', year: 2010 },
  { title: 'Blade Runner 2049', year: 2017 },
  // Misc
  { title: 'The Grand Budapest Hotel', year: 2014 },
  { title: 'Once Upon a Time in Hollywood', year: 2019 },
  { title: 'Joker', year: 2019 },
  { title: 'Tenet', year: 2020 },
];

// ---------------------------------------------------------------------------
// Helper builders
// ---------------------------------------------------------------------------

function dotify(str) {
  return str.replace(/\s+/g, '.').replace(/'/g, '').replace(/:/g, '');
}

function touch(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, '');
}

function writeSmall(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
}

// Pick a random element from an array
function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickN(arr, n) {
  const copy = [...arr];
  const result = [];
  for (let i = 0; i < n && copy.length; i++) {
    const idx = Math.floor(Math.random() * copy.length);
    result.push(copy.splice(idx, 1)[0]);
  }
  return result;
}

// ---------------------------------------------------------------------------
// Filename pattern generators
// ---------------------------------------------------------------------------

const groups = ['SPARKS', 'RARBG', 'EVO', 'FGT', 'NTb', 'FLUX', 'CMRG', 'YIFY', 'GECKOS', 'LAZERS', 'CODEX'];
const services = ['AMZN', 'NF', 'DSNP', 'HMAX', 'ATVP'];

function sceneRelease1080(movie, ext) {
  // Movie.Name.2023.1080p.BluRay.x264-GROUPNAME.mkv
  const source = pick(['BluRay', 'WEB-DL', 'WEBRip', 'BRRip', 'REMUX']);
  const codec = pick(['x264', 'H.264', 'x265', 'H.265']);
  const audio = pick(['AC3', 'DDP5.1', 'DTS', 'AAC', 'TrueHD.Atmos']);
  const group = pick(groups);
  const d = dotify(movie.title);
  return `${d}.${movie.year}.1080p.${source}.${audio}.${codec}-${group}.${ext}`;
}

function sceneRelease720(movie, ext) {
  const source = pick(['WEB-DL', 'WEBRip', 'BluRay', 'HDRip']);
  const codec = pick(['x264', 'H.264', 'XviD']);
  const audio = pick(['AC3', 'AAC', 'DTS']);
  const service = Math.random() > 0.5 ? `${pick(services)}.` : '';
  const group = pick(groups);
  const d = dotify(movie.title);
  return `${d}.${movie.year}.720p.${service}${source}.${audio}.${codec}-${group}.${ext}`;
}

function sceneRelease4K(movie, ext) {
  // 2160p UHD with HDR
  const hdr = pick(['HDR', 'HDR10', 'DolbyVision', 'HDR10Plus']);
  const codec = pick(['x265', 'HEVC', 'AV1']);
  const audio = pick(['DTS-HD.MA.7.1', 'TrueHD.Atmos', 'DDP5.1']);
  const extras = Math.random() > 0.6 ? '.REMUX' : '.UHD.BluRay';
  const group = pick(groups);
  const d = dotify(movie.title);
  return `${d}.${movie.year}.2160p${extras}.${hdr}.${audio}.${codec}-${group}.${ext}`;
}

function p2pBrackets(movie, ext) {
  // Movie Name (2023) [1080p] [BluRay] [x264]
  const res = pick(['720p', '1080p', '2160p']);
  const source = pick(['BluRay', 'WEBRip', 'WEB-DL']);
  const codec = pick(['x264', 'x265', 'HEVC']);
  return `${movie.title} (${movie.year}) [${res}] [${source}] [${codec}].${ext}`;
}

function p2pYIFY(movie, ext) {
  // Movie Name 2023 BRRip XviD AC3-YIFY
  const source = pick(['BRRip', 'WEBRip', 'HDRip']);
  const codec = pick(['XviD', 'x264', 'HEVC']);
  const audio = pick(['AC3', 'AAC']);
  return `${movie.title} ${movie.year} ${source} ${codec} ${audio}-YIFY.${ext}`;
}

function withEdition(movie, baseNameFn, ext) {
  // Wrap a base name generator to inject a special edition tag
  const editions = ['Directors.Cut', 'Extended', 'Unrated', 'Remastered', 'IMAX', 'Criterion.Collection', 'Snyder.Cut', 'Final.Cut'];
  const ed = pick(editions);
  const base = baseNameFn(movie, ext);
  // Insert edition before the resolution token if possible
  return base.replace(/\.(720p|1080p|2160p|BRRip|WEBRip)/, `.${ed}.$1`);
}

function withProper(name) {
  return name.replace(/(-\w+\.\w+$)|(-\w+$)/, '.PROPER$&');
}

// ---------------------------------------------------------------------------
// Companion file creators
// ---------------------------------------------------------------------------

function addCompanions(baseNoExt, dir, flags) {
  if (flags.nfo) {
    writeSmall(path.join(dir, `${baseNoExt}.nfo`), `[NFO]\nTitle: ${baseNoExt}\n`);
  }
  if (flags.srt) {
    touch(path.join(dir, `${baseNoExt}.srt`));
  }
  if (flags.sub) {
    touch(path.join(dir, `${baseNoExt}.sub`));
  }
  if (flags.jpg) {
    touch(path.join(dir, `${baseNoExt}.jpg`));
  }
  if (flags.url) {
    writeSmall(path.join(dir, `${baseNoExt}.url`), '[InternetShortcut]\nURL=https://www.imdb.com/\n');
  }
}

// ---------------------------------------------------------------------------
// DVD folder structure
// ---------------------------------------------------------------------------

function createDvdFolder(movie, parentDir) {
  const d = dotify(movie.title);
  const group = pick(groups);
  const folderName = `${d}.${movie.year}.DVDRip.XviD-${group}`;
  const folderPath = path.join(parentDir, folderName);
  const vtsDir = path.join(folderPath, 'VIDEO_TS');
  fs.mkdirSync(vtsDir, { recursive: true });
  // Typical VIDEO_TS contents
  touch(path.join(vtsDir, 'VIDEO_TS.IFO'));
  touch(path.join(vtsDir, 'VTS_01_0.IFO'));
  touch(path.join(vtsDir, 'VTS_01_1.VOB'));
  touch(path.join(vtsDir, 'VTS_01_2.VOB'));
  touch(path.join(vtsDir, 'VTS_01_0.BUP'));
  // Optional companion at root
  if (Math.random() > 0.5) {
    writeSmall(path.join(folderPath, `${d}.nfo`), `[NFO]\n${movie.title} (${movie.year})\n`);
  }
  console.log(`  [DVD]  ${folderName}/`);
}

// ---------------------------------------------------------------------------
// Main generation
// ---------------------------------------------------------------------------

function generate() {
  const dirs = {
    movies: path.join(OUTPUT_DIR, 'Movies'),
    uhd: path.join(OUTPUT_DIR, '4K Movies'),
    dvd: path.join(OUTPUT_DIR, 'DVD Rips'),
    new: path.join(OUTPUT_DIR, 'New Downloads'),
  };

  for (const d of Object.values(dirs)) {
    fs.mkdirSync(d, { recursive: true });
  }

  // Shuffle movies so distribution is varied each run
  const pool = [...movies].sort(() => Math.random() - 0.5);

  let created = 0;

  // --- Movies/ (scene 1080p, some with editions/PROPER, companions) ---
  const moviesSlice = pool.slice(0, 12);
  console.log('\nMovies/');
  for (const movie of moviesSlice) {
    const ext = pick(['mkv', 'mp4', 'm4v']);
    let name;
    const r = Math.random();
    if (r < 0.4) {
      name = sceneRelease1080(movie, ext);
    } else if (r < 0.7) {
      name = withEdition(movie, sceneRelease1080, ext);
    } else if (r < 0.85) {
      name = p2pBrackets(movie, ext);
    } else {
      name = withProper(sceneRelease1080(movie, ext));
    }

    const filePath = path.join(dirs.movies, name);
    touch(filePath);
    console.log(`  ${name}`);

    const baseNoExt = name.replace(/\.\w+$/, '');
    const companions = {
      nfo: Math.random() > 0.5,
      srt: Math.random() > 0.6,
      sub: Math.random() > 0.8,
      jpg: Math.random() > 0.65,
      url: Math.random() > 0.85,
    };
    addCompanions(baseNoExt, dirs.movies, companions);
    created++;
  }

  // --- 4K Movies/ (scene 2160p) ---
  const uhdSlice = pool.slice(12, 22);
  console.log('\n4K Movies/');
  for (const movie of uhdSlice) {
    const ext = pick(['mkv', 'ts']);
    let name;
    if (Math.random() > 0.3) {
      name = sceneRelease4K(movie, ext);
    } else {
      name = withEdition(movie, sceneRelease4K, ext);
    }
    const filePath = path.join(dirs.uhd, name);
    touch(filePath);
    console.log(`  ${name}`);

    const baseNoExt = name.replace(/\.\w+$/, '');
    addCompanions(baseNoExt, dirs.uhd, {
      nfo: Math.random() > 0.4,
      jpg: Math.random() > 0.5,
      srt: Math.random() > 0.7,
    });
    created++;
  }

  // --- DVD Rips/ (older DVDRip files + DVD folder structures) ---
  const dvdSlice = pool.slice(22, 30);
  console.log('\nDVD Rips/');
  for (let i = 0; i < dvdSlice.length; i++) {
    const movie = dvdSlice[i];
    if (i < 3) {
      // DVD folder with VIDEO_TS
      createDvdFolder(movie, dirs.dvd);
      created++;
    } else {
      // Flat DVDRip file
      const ext = pick(['avi', 'mkv', 'mp4']);
      const d = dotify(movie.title);
      const codec = pick(['XviD', 'x264', 'DivX']);
      const audio = pick(['AC3', 'MP3', 'AAC']);
      const group = pick(groups);
      const name = `${d}.${movie.year}.DVDRip.${codec}.${audio}-${group}.${ext}`;
      touch(path.join(dirs.dvd, name));
      console.log(`  ${name}`);

      const baseNoExt = name.replace(/\.\w+$/, '');
      addCompanions(baseNoExt, dirs.dvd, {
        nfo: Math.random() > 0.4,
        srt: Math.random() > 0.7,
      });
      created++;
    }
  }

  // --- New Downloads/ (mixed, includes 720p, P2P casual, some scene) ---
  const newSlice = pool.slice(30);
  console.log('\nNew Downloads/');
  for (const movie of newSlice) {
    const ext = pick(['mkv', 'avi', 'mp4', 'm4v', 'ts']);
    let name;
    const r = Math.random();
    if (r < 0.3) {
      name = sceneRelease720(movie, ext);
    } else if (r < 0.55) {
      name = p2pYIFY(movie, ext);
    } else if (r < 0.75) {
      name = p2pBrackets(movie, ext);
    } else {
      name = sceneRelease1080(movie, ext);
    }
    touch(path.join(dirs.new, name));
    console.log(`  ${name}`);

    const baseNoExt = name.replace(/\.\w+$/, '');
    addCompanions(baseNoExt, dirs.new, {
      nfo: Math.random() > 0.6,
      srt: Math.random() > 0.55,
      jpg: Math.random() > 0.8,
      url: Math.random() > 0.9,
    });
    created++;
  }

  console.log(`\nDone. Created ${created} movie entries in ${OUTPUT_DIR}`);
}

generate();
