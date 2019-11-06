import CloudflareWorkerGlobalScope, {CloudflareWorkerKV} from 'types-cloudflare-worker';
import fileCore from "../lib/fileCore";

declare var self: CloudflareWorkerGlobalScope;
declare var STATIC_KV: CloudflareWorkerKV;

export class Worker {
    public async handle(event: FetchEvent) {

        // First: use index.html for the root
        let path = new URL(event.request.url).pathname;
        if (path == '/') {
            path = '/index.html'
        }
        //
        // call the cache api-like API for fileCore
        // Param 1: file name/path
        // Param 2: the KV namespace CF is injecting
        // Param 3: whether or not to use cache
        // Param 4: request for cache matches and puts
        // Param 5: any custom response headers (accept-ranges is not supported)
        //
        // the custom headers (param 5) is not included in the sample
        //
        let _filecore = await fileCore.getFile(path, STATIC_KV, true, event.request);
        // Due to the streaming nature if the file is over 10mb,
        // be wary before trying to create your own response from this returned response
        if (_filecore) {
            return _filecore;
        }
        // no file was found, so do other code/handling
        // since this is the stand-alone worker, we 404
        return new Response("404 not found", {status: 404});
    }
}
self.addEventListener('fetch', (event: FetchEvent) => {
    const worker = new Worker();
    event.respondWith(worker.handle(event));
});
