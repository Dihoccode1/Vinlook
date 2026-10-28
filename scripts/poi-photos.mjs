import { mkdir, readFile, writeFile, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import sql from 'mssql';

const folder = new URL('../services/poi-service/database/seeds/images/', import.meta.url);
const manifestFile = new URL('additional-photos.json', folder);
const searches = {
  'nha-tho-duc-ba': 'Saigon Notre Dame Cathedral',
  'nha-hat-thanh-pho': 'Saigon Opera House exterior',
  'tru-so-ubnd-thanh-pho': 'Ho Chi Minh City Hall exterior',
  'pho-di-bo-nguyen-hue': 'Nguyen Hue pedestrian street',
  'bao-tang-chung-tich-chien-tranh': 'War Remnants Museum exterior',
  'bao-tang-thanh-pho': 'Ho Chi Minh City Museum exterior',
  'bao-tang-my-thuat': 'Ho Chi Minh City Museum of Fine Arts exterior',
  'bao-tang-lich-su': 'Museum of Vietnamese History Ho Chi Minh City',
  'ben-nha-rong': 'Nha Rong Wharf Ho Chi Minh museum',
  'nha-tho-tan-dinh': 'Tan Dinh Church exterior',
  'chua-ngoc-hoang': 'Jade Emperor Pagoda Ho Chi Minh',
  'chua-ba-thien-hau': 'Thien Hau Temple Ho Chi Minh City',
  'cho-binh-tay': 'Binh Tay Market exterior',
  'cho-tan-dinh': 'Tan Dinh Market exterior',
  'duong-sach-nguyen-van-binh': 'Nguyen Van Binh book street',
  'ben-bach-dang': 'Bach Dang Wharf Ho Chi Minh City',
  'chua-giac-lam': 'Giac Lam Pagoda Ho Chi Minh',
};
const headers = { 'User-Agent': 'Vinlook/0.1 (educational POI photo importer; github.com/Dihoccode1/Vinlook)' };
// Selected from the corresponding Wikipedia articles and checked Commons file pages.
const selectedFiles = {
  'nha-tho-duc-ba': 'Basílica de Nuestra Señora, Ciudad Ho Chi Minh, Vietnam, 2013-08-14, DD 03.JPG',
  'nha-hat-thanh-pho': 'Saigon Opera House 2014.jpg',
  'tru-so-ubnd-thanh-pho': 'Ho Chi Minh City, City Hall, 2020-01 CN-02.jpg',
  'pho-di-bo-nguyen-hue': 'Nguyen Hue Street 2020.jpg',
  'bao-tang-chung-tich-chien-tranh': 'War Remnants Museum, HCMC, front.JPG',
  'bao-tang-thanh-pho': 'Bảo tàng Thành phố Hồ Chí Minh 7.jpg',
  'bao-tang-my-thuat': 'Bảo tàng Mỹ thuật Tp (kiến trúc tổng thể) (2).jpg',
  'bao-tang-lich-su': 'Vietnam History Museum HCMC.JPG',
  'ben-nha-rong': 'Ho Chi Minh Museum, Saigon.jpg',
  'nha-tho-tan-dinh': 'Tân Định Church 20190922.jpg',
  'chua-ngoc-hoang': 'Jade Emperor Pagoda Saigon.jpg',
  'chua-ba-thien-hau': '20190923 Thien Hau Temple front.jpg',
  'cho-binh-tay': 'Vn-hcm-cho-binh-tay-27-07-07.JPG',
  'cho-tan-dinh': 'Cho Tan dinh- duong hai ba trung-Tân Định, Quận 1, TPHCM, Việt Nam - panoramio.jpg',
  'duong-sach-nguyen-van-binh': 'Nhà thờ Đức Bà nhìn từ đường Nguyễn Văn Bình.jpg',
  'ben-bach-dang': 'Saigon Skyline.jpg',
  'chua-giac-lam': 'ChuaGiacLam02.jpg',
};
function plain(value = '') { return value.replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s+/g, ' ').trim(); }
function safeMediaUrl(value) {
  const url = new URL(value);
  if (url.protocol !== 'https:' || !['upload.wikimedia.org', 'thumb.wikimedia.org'].includes(url.hostname)) throw new Error('Untrusted media URL');
  return url;
}
function validJpeg(bytes) { return bytes.length > 3 && bytes.length <= 5242880 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff; }
async function prepare() {
  await mkdir(folder, { recursive: true });
  let manifest = [];
  try { manifest = JSON.parse(await readFile(manifestFile, 'utf8')); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  const metadataUrl = new URL('https://commons.wikimedia.org/w/api.php');
  metadataUrl.search = new URLSearchParams({ action: 'query', format: 'json', titles: Object.values(selectedFiles).map(name => `File:${name}`).join('|'), prop: 'imageinfo', iiprop: 'url|extmetadata|mime|size', iiurlwidth: '960' }).toString();
  const metadataResponse = await fetch(metadataUrl, { headers, signal: AbortSignal.timeout(30000) });
  if (!metadataResponse.ok) throw new Error(`Commons metadata: HTTP ${metadataResponse.status}`);
  const metadataBody = await metadataResponse.json();
  await writeFile(new URL('selected-photo-metadata.json', folder), JSON.stringify(metadataBody, null, 2));
  for (const [slug, query] of Object.entries(searches)) {
    if (manifest.some(item => item.slug === slug && item.title === `File:${selectedFiles[slug]}`) && await stat(new URL(`${slug}.jpg`, folder)).catch(() => undefined)) { console.log(`Existing ${slug}`); continue; }
    const pages = Object.values(metadataBody.query?.pages ?? {}).filter(page => page.title === `File:${selectedFiles[slug]}`);
    let saved = false;
    for (const page of pages) {
      const info = page.imageinfo?.[0]; const metadata = info?.extmetadata;
      if (!info || info.mime !== 'image/jpeg' || !metadata?.Artist?.value) continue;
      const license = plain(metadata.LicenseShortName?.value);
      if (!/^(CC BY(?:-SA)? [1-4]\.0|CC0|Public domain)$/i.test(license)) continue;
      const licenseUrl = metadata.LicenseUrl?.value ?? (license === 'Public domain' ? 'https://commons.wikimedia.org/wiki/Commons:Public_domain' : undefined);
      if (!licenseUrl) continue;
      const media = safeMediaUrl(info.thumburl ?? info.url);
      const image = await fetch(media, { headers, signal: AbortSignal.timeout(30000), redirect: 'error' });
      if (!image.ok) { console.log(`Download skipped ${page.title}: HTTP ${image.status}`); continue; }
      const bytes = Buffer.from(await image.arrayBuffer()); if (!validJpeg(bytes)) continue;
      await writeFile(new URL(`${slug}.jpg`, folder), bytes);
      manifest = manifest.filter(item => item.slug !== slug);
      manifest.push({ slug, file: `${slug}.jpg`, title: page.title, author: plain(metadata.Artist.value), license, licenseUrl: licenseUrl.replace(/^http:/, 'https:'), sourceUrl: info.descriptionurl, downloadUrl: media.href, sha256: createHash('sha256').update(bytes).digest('hex'), bytes: bytes.length });
      await writeFile(manifestFile, JSON.stringify(manifest, null, 2) + '\n');
      console.log(`${slug}: ${page.title} (${bytes.length} bytes, ${license})`); saved = true; break;
    }
    if (!saved) console.log(`NEEDS_SELECTION ${slug}`);
  }
  console.log(`Downloaded ${manifest.length}/${Object.keys(searches).length} photographs. Review before import.`);
}
async function importPhotos() {
  const manifest = JSON.parse(await readFile(manifestFile, 'utf8'));
  const pool = await new sql.ConnectionPool({ server: process.env.SQLSERVER_HOST ?? 'localhost', port: Number(process.env.SQLSERVER_PORT ?? 1433), database: process.env.SQLSERVER_DATABASE ?? 'PoiDb', user: process.env.SQLSERVER_USER ?? 'sa', password: process.env.SQLSERVER_PASSWORD, options: { encrypt: process.env.SQLSERVER_ENCRYPT !== 'false', trustServerCertificate: process.env.SQLSERVER_TRUST_CERTIFICATE === 'true' } }).connect();
  try {
    for (const item of manifest) {
      if (!Object.hasOwn(searches, item.slug) || item.file !== `${item.slug}.jpg` || item.title !== `File:${selectedFiles[item.slug]}`) throw new Error('Invalid manifest entry');
      const bytes = await readFile(new URL(item.file, folder));
      if (!validJpeg(bytes) || createHash('sha256').update(bytes).digest('hex') !== item.sha256) throw new Error(`Invalid photo ${item.slug}`);
      const credit = `${item.author} · ${item.license}`;
      if (credit.length > 300) throw new Error(`Attribution too long: ${item.slug}`);
      await pool.request().input('slug', sql.NVarChar(160), item.slug).input('content', sql.VarBinary(sql.MAX), bytes)
        .input('hash', sql.Char(64), item.sha256).input('credit', sql.NVarChar(300), credit)
        .input('source', sql.NVarChar(2048), item.sourceUrl).input('license', sql.NVarChar(2048), item.licenseUrl)
        .query(`SET XACT_ABORT ON; BEGIN TRANSACTION;
          DECLARE @id UNIQUEIDENTIFIER; SELECT @id = Id FROM dbo.Pois WITH (UPDLOCK, SERIALIZABLE) WHERE Slug = @slug;
          IF @id IS NULL THROW 51000, 'POI not found', 1;
          IF NOT EXISTS (SELECT 1 FROM dbo.PoiImages WHERE PoiId = @id)
          BEGIN
            INSERT INTO dbo.PoiImages (PoiId, Content, ContentType, Sha256) VALUES (@id, @content, 'image/jpeg', @hash);
            UPDATE dbo.Pois SET ImageUrl = '/api/pois/' + CONVERT(VARCHAR(36), @id) + '/image', ImageCredit = @credit,
              ImageSourceUrl = @source, ImageLicenseUrl = @license, UpdatedAt = SYSUTCDATETIME() WHERE Id = @id;
          END;
          COMMIT TRANSACTION;`);
      console.log(`Imported/preserved ${item.slug}`);
    }
    const count = await pool.request().query('SELECT COUNT(*) AS published, COUNT(i.PoiId) AS withPhotos FROM dbo.Pois p LEFT JOIN dbo.PoiImages i ON i.PoiId = p.Id WHERE p.IsPublished = 1');
    console.log(JSON.stringify(count.recordset));
  } finally { await pool.close(); }
}
async function verifyPhotos() {
  const base = process.env.PHOTO_GATEWAY_URL ?? 'http://localhost:4000';
  const response = await fetch(new URL('/api/pois?limit=20', base), { signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw new Error('POI list unavailable');
  const result = await response.json(); let checked = 0;
  for (const poi of result.data) {
    if (!poi.imageUrl?.startsWith('/api/pois/') || !poi.imageCredit || !poi.imageSourceUrl || !poi.imageLicenseUrl) throw new Error(`Missing photo attribution: ${poi.slug}`);
    const image = await fetch(new URL(poi.imageUrl, base), { signal: AbortSignal.timeout(10000) });
    const bytes = Buffer.from(await image.arrayBuffer());
    if (!image.ok || !validJpeg(bytes) || !image.headers.get('content-type')?.startsWith('image/jpeg')) throw new Error(`Invalid served image: ${poi.slug}`);
    const etag = image.headers.get('etag');
    if (etag !== `"${createHash('sha256').update(bytes).digest('hex')}"`) throw new Error(`Invalid ETag: ${poi.slug}`);
    const cached = await fetch(new URL(poi.imageUrl, base), { headers: { 'If-None-Match': etag, 'Cache-Control': 'max-age=0' }, signal: AbortSignal.timeout(10000) });
    if (cached.status !== 304) throw new Error(`Invalid image cache response: ${poi.slug}`);
    checked++;
  }
  if (checked !== result.pagination.total) throw new Error('Not all POIs were checked');
  console.log(`Verified ${checked} POI images: JPEG bytes, source/license attribution, SHA-256 ETag and HTTP 304.`);
}
const mode = process.argv[2];
if (mode === 'prepare') await prepare();
else if (mode === 'import') await importPhotos();
else if (mode === 'verify') await verifyPhotos();
else throw new Error('Use prepare, import or verify');
