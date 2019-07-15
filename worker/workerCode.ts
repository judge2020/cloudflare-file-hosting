import CloudflareWorkerGlobalScope, {CloudflareDefaultCacheStorage, CloudflareWorkerKV} from 'types-cloudflare-worker';
import abs2str from "arraybuffer-to-string";
import * as constants from "./constants";

declare var self: CloudflareWorkerGlobalScope;
declare var STATIC_KV: CloudflareWorkerKV;
let cache: CloudflareDefaultCacheStorage = caches.default;

export class Worker {
    public async handle(event: FetchEvent) {
        let reqpath = new URL(event.request.url).pathname.replace('%20', ' ');
        if (reqpath === '/') {
            // Index will by default go to '/index.html' (can be changed in ./constants.ts
            reqpath = constants.default_index
        }

        // remove leading slash
        reqpath = reqpath.substr(1);

        let filenamesplit = reqpath.split('.');
        let fileExtension = filenamesplit[filenamesplit.length - 1];
        let contenttype = constants.extensionToContentType[fileExtension] || constants.default_ct;


        let value = await STATIC_KV.get(reqpath, "arrayBuffer");

        // if this isn't in the namespace, 404
        if (value === null) {
            return new Response(constants.error_404, {status: 404})
        }

        // check if this is a split file
        let _asStr = abs2str(value);
        if (!_asStr.startsWith('SPLIT_')) {
            // file is not split, return <2mb arrayBuffer
            return new Response(value, {
                headers: {
                    'content-type': contenttype,
                    'Accept-Ranges': 'none',
                },
            });
        }

        // file stitching logic

        let {readable, writable} = new TransformStream();

        // numberOfKeys is formatted as `SPLIT_<indexes>`,
        // eg. a 5-part file will be represented as `SPLIT_5` and have KV values at `<file>_0` to `<file>_4`
        let numberOfKeys = _asStr.split('_')[1];

        streamKv(numberOfKeys, writable, reqpath);

        return new Response(readable, {
            headers: {
                'content-type': contenttype,
                'Accept-Ranges': 'none',
            },
        })
    }
}

async function streamKv(numberOfKeys, writable: WritableStream, reqpath) {
    let writer = writable.getWriter();
    for (let i = 0; i < numberOfKeys; ++i) {
        writer.releaseLock();
        let a = await STATIC_KV.get(`${reqpath}_${i}`, "stream");
        await a.pipeTo(writable, {preventClose: true});
        writer = writable.getWriter()
    }
    await writer.close()
}

self.addEventListener('fetch', (event: FetchEvent) => {
    const worker = new Worker();
    event.respondWith(worker.handle(event));
});
