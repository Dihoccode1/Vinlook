import {openOfflineStorage} from '../src/offline/indexed-db.js';
import {createPackageStore,sha256} from '../src/offline/package-store.js';
if(!import.meta.env.DEV)throw Error('FIXTURE_FORBIDDEN');
window.offlineFixture={openOfflineStorage,createPackageStore,sha256};
