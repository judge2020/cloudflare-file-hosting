import CloudflareWorkerGlobalScope, {CloudflareWorkerKV} from 'types-cloudflare-worker';

declare var self: CloudflareWorkerGlobalScope;
declare var STATIC_KV: CloudflareWorkerKV;

import abs2str from "arraybuffer-to-string";

// non-exhaustive. Add more to your own deployment if you use other extensions.
const textExtensions = [
    "js",
    "css",
    "html",
    "json",
    "htm",
    "sh",
    "xml",
];
const extensionToContentType = {
    'css': 'text/css',
    'html': 'text/html',
    'js': 'application/javascript',
    'json': 'application/json',
    'acc': 'audio/acc',
    'avi': 'video/x-msvideo',
    'bin': 'application/octet-stream',
    'bmp': 'image/bmp',
    'bz2': 'application/x-bzip2',
    'bz': 'application/x-bzip',
    'csv': 'text/csv',
    'epub': 'application/epub+zip',
    'gif': 'image/gif',
    'htm': 'text/html',
    'ico': 'image/vnd.microsoft.icon',
    'jar': 'application/java-archive',
    'jpeg': 'image/jpeg',
    'jpg': 'image/jpeg',
    'mp3': 'audio/mpeg',
    'mp4': 'video/mp4',
    'mpeg': 'video/mpeg',
    'pdf': 'application/pdf',
    'png': 'image/png',
    'rar': 'application/x-rar-compressed',
    'rtf': 'application/rtf',
    'sh': 'application/x-sh',
    'swf': 'application/x-shockwave-flash',
    'tar': 'application/x-tar',
    'tif': 'image/tiff',
    'tiff': 'image/tiff',
    'ttf': 'font/ttf',
    'wav': 'audio/wav',
    'webm': 'video/webm',
    'webp': 'image/webp',
    'woff': 'font/woff',
    'woff2': 'font/woff2',
    'xml': 'text/xml',
    'zip': 'application/zip',
    '7z': 'application/x-7z-compressed',
};

function _appendBuffer(buffer1, buffer2) {
    let tmp = new Uint8Array(buffer1.byteLength + buffer2.byteLength);
    tmp.set(new Uint8Array(buffer1), 0);
    tmp.set(new Uint8Array(buffer2), buffer1.byteLength);
    return tmp.buffer;
};

export class Worker {
    public async handle(event: FetchEvent) {
        let reqpath = new URL(event.request.url).pathname.replace('%20', ' ');
        if (reqpath === '/') {
            // feel free to change if index.html isn't your index
            reqpath = '/index.html'
        }
        // remove leading slash
        reqpath = reqpath.substr(1);

        let filenamesplit = reqpath.split('.');
        let fileExtension = filenamesplit[filenamesplit.length - 1];
        let contenttype = extensionToContentType[fileExtension] || "text/plain";


        let value;
        value = await STATIC_KV.get(reqpath, "arrayBuffer");

        // if this isn't in the namespace, 404
        if (value === null) {
            return new Response('file not found', {status: 404})
        }

        // check if this is a split file.
        // may incur performance issues for non-split files
        let _asStr = abs2str(value);
        if (_asStr.startsWith('SPLIT_')) {
            // file stitching logic

            // numberOfKeys is formatted as `SPLIT_<indexes>`,
            // eg. a 5-part file will be represented as `SPLIT_5` and have KV values at `<file>_0` to `<file>_4`
            let numberOfKeys = _asStr.split('_')[1];

            // initialize the first arrayBuffer with actual content
            value = await STATIC_KV.get(`${reqpath}_0`, "arrayBuffer");
            // constantly replace `value` with the bigger arrayBuffer (to save on memory usage)
            for (let i = 1; i < numberOfKeys; i++) {
                let _splitvalue = await STATIC_KV.get(`${reqpath}_${i}`, "arrayBuffer");
                value = _appendBuffer(value, _splitvalue)
            }
        }


        return new Response(value, {
            headers: {
                'content-type': contenttype,
            },
        })
    }
}

self.addEventListener('fetch', (event: FetchEvent) => {
    const worker = new Worker();
    event.respondWith(worker.handle(event));
});
