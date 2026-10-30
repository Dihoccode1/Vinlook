import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import sql from 'mssql';
import {config} from './config/index.js';
import {west_saigon_pois} from './content/west-saigon-pois.js';
import {editorial_provider} from './content/saigon-pois.js';
import {render_editorial} from './content/editorial-locales.js';
import {languages} from './modules/languages/languages.js';

interface Photo {slug:string;file:string;content_type:string;sha256:string;credit:string;source_url:string;license_url:string}
async function main(){
  const photo_folder=new URL('../../poi-service/database/seeds/images/west-saigon/',import.meta.url);
  const photos=JSON.parse(await readFile(new URL('manifest.json',photo_folder),'utf8')) as Photo[];
  const poi_pool=new sql.ConnectionPool({...config.database,database:process.env.SQLSERVER_DATABASE??'PoiDb',user:process.env.SQLSERVER_USER??'sa',password:process.env.SQLSERVER_PASSWORD??''});
  const translation_pool=new sql.ConnectionPool(config.database);
  let inserted_pois=0,inserted_translations=0,inserted_images=0,preserved_edited_pois=0;
  try{
    await poi_pool.connect();await translation_pool.connect();
    for(const poi of west_saigon_pois){
      const description=render_editorial(poi,'vi');
      const id = (await poi_pool.request().query("SELECT 'POI'+FORMAT(NEXT VALUE FOR dbo.pois_id_seq,'000') AS id")).recordset[0].id as string;
      const result=await poi_pool.request().input('id',sql.VarChar(36),id).input('slug',sql.NVarChar(160),poi.slug).input('name',sql.NVarChar(200),poi.name).input('description',sql.NVarChar(sql.MAX),description).input('intro',sql.NVarChar(3000),poi.visitor_description).input('address',sql.NVarChar(500),poi.address).input('lat',sql.Float,poi.latitude).input('lon',sql.Float,poi.longitude).input('category',sql.NVarChar(50),poi.category).query(`
        SET XACT_ABORT ON; BEGIN TRANSACTION; DECLARE @inserted INT=0;
        IF NOT EXISTS(SELECT 1 FROM dbo.pois WITH(UPDLOCK,SERIALIZABLE) WHERE slug=@slug)
        BEGIN
          INSERT INTO dbo.pois(id,slug,name,description,visitor_description,address,latitude,longitude,category,source_language,is_published)
          VALUES(@id,@slug,@name,@description,@intro,@address,@lat,@lon,@category,'vi',1);
          SET @inserted=1;
        END;
        SELECT @inserted AS inserted;
        SELECT id,name,description,source_language FROM dbo.pois WHERE slug=@slug;
        COMMIT TRANSACTION;`);
      const sets=result.recordsets as sql.IRecordSet<unknown>[];
      inserted_pois+=Number((sets[0][0] as {inserted:number}).inserted);
      const current=sets[1][0] as {id:string;name:string;description:string;source_language:string};
      if(!current||current.name!==poi.name||current.description!==description||current.source_language!=='vi'){preserved_edited_pois++;continue;}
      const source_hash=createHash('sha256').update(JSON.stringify(['vi',current.name,description])).digest('hex');
      for(const {code} of languages){
        if(code==='vi')continue;
        const text=render_editorial(poi,code);
        const saved=await translation_pool.request().input('id',sql.VarChar(36),current.id).input('lang',sql.VarChar(10),code).input('hash',sql.Char(64),source_hash).input('name',sql.NVarChar(2000),poi.name).input('text',sql.NVarChar(sql.MAX),text).input('provider',sql.NVarChar(50),editorial_provider).query(`
          SET XACT_ABORT ON; BEGIN TRANSACTION; DECLARE @inserted INT=0;
          IF NOT EXISTS(SELECT 1 FROM dbo.poi_translations WITH(UPDLOCK,SERIALIZABLE) WHERE poi_id=@id AND language_code=@lang)
          BEGIN
            INSERT INTO dbo.poi_translations(poi_id,language_code,source_language,source_hash,name,description,provider,translated_at)
            VALUES(@id,@lang,'vi',@hash,@name,@text,@provider,SYSUTCDATETIME());
            SET @inserted=1;
          END;
          SELECT @inserted AS inserted; COMMIT TRANSACTION;`);
        inserted_translations+=Number(saved.recordset[0].inserted);
      }
      const photo=photos.find(p=>p.slug===poi.slug);
      if(photo){
        const content=await readFile(new URL(photo.file,photo_folder));
        if(content.length>5242880||createHash('sha256').update(content).digest('hex')!==photo.sha256)throw new Error(`Invalid photo: ${poi.slug}`);
        const image=await poi_pool.request().input('id',sql.VarChar(36),current.id).input('content',sql.VarBinary(sql.MAX),content).input('type',sql.VarChar(30),photo.content_type).input('hash',sql.Char(64),photo.sha256).input('credit',sql.NVarChar(300),photo.credit).input('source',sql.NVarChar(2048),photo.source_url).input('license',sql.NVarChar(2048),photo.license_url).query(`
          SET XACT_ABORT ON; BEGIN TRANSACTION; DECLARE @inserted INT=0;
          IF NOT EXISTS(SELECT 1 FROM dbo.poi_images WITH(UPDLOCK,SERIALIZABLE) WHERE poi_id=@id)
          BEGIN
            INSERT INTO dbo.poi_images(poi_id,content,content_type,sha256) VALUES(@id,@content,@type,@hash);
            UPDATE dbo.pois SET image_url='/api/pois/'+CONVERT(VARCHAR(36),id)+'/image',image_credit=@credit,image_source_url=@source,image_license_url=@license WHERE id=@id;
            SET @inserted=1;
          END;
          SELECT @inserted AS inserted; COMMIT TRANSACTION;`);
        inserted_images+=Number(image.recordset[0].inserted);
      }
    }
    const total=(await poi_pool.request().query('SELECT COUNT(*) AS total FROM dbo.pois WHERE is_published=1')).recordset[0].total;
    console.log(JSON.stringify({inserted_pois,inserted_translations,inserted_images,preserved_edited_pois,published_pois:total}));
  }finally{await poi_pool.close();await translation_pool.close();}
}
main().catch(error=>{console.error('West Saigon import failed:',error instanceof Error?error.message:'Unknown error');process.exitCode=1;});
