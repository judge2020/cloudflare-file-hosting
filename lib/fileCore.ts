import {CloudflareWorkerKV} from "types-cloudflare-worker";
import {ArrayBufferToString} from "./workerhelpers";

import * as constants from "../worker/constants";


export default class FileCore {

    public static getContentType(fileName, defaultType = "text/plain", ct = constants.extensionToContentType) {
        let filenamesplit = fileName.split('.');
        let fileExtension = filenamesplit[filenamesplit.length - 1];
        return ct[fileExtension] || defaultType;
    }

    /**
     * Check if a file exists in the specified KV namespace. If so, return a response for that file
     * @param filePath Path to the file, eg `new URL(event.request.url).pathname`
     * @param KV_NAMESPACE a KV namespace binding for your files
     * @param useCache Whether or not to use the cache API. Will only cache files less than 10mb in size.
     * @param requestForCache If you set useCache to true, this is the event.request object to use for cache matching.
     * @param customHeaders any custom headers
     * @return {Response} Response when a file is found; immediately return this if it's found or streamed responses will not work
     * @return {null} null when a file is not found in KV
     */
    public static async getFile(filePath: string, KV_NAMESPACE: CloudflareWorkerKV, useCache: boolean = false, requestForCache: Request | null = null, customHeaders = {}): Promise<Response | null> {
        // remove a leading slash
        if (filePath.startsWith("/")) {
            filePath = filePath.substr(1);
        }
        // replace %20 with space since the CLI uploads with the space
        filePath = filePath.replace('%20', ' ');

        // test cache before pulling from KV
        if (useCache && requestForCache) {
            let _cache = await caches.default.match(requestForCache);
            if (_cache) {
                return _cache;
            }
        }

        let arrayBufferValue = await KV_NAMESPACE.get(filePath, "arrayBuffer");

        if (arrayBufferValue === null) {
            return null
        }

        // prep custom headers
        customHeaders["content-type"] = this.getContentType(filePath);
        customHeaders["accept-ranges"] = "none";

        // we use an arrayBuffer so that, if the file is <10mb, we can instantly return it
        let _asStr = ArrayBufferToString(arrayBufferValue);
        if (!_asStr.startsWith('SPLIT_')) {
            let resp = new Response(arrayBufferValue, {
                headers: customHeaders
            });
            if (useCache && requestForCache) {
                await caches.default.put(requestForCache, resp.clone());
            }
            return resp;
        }

        // file stitching logic

        let {readable, writable} = new TransformStream();

        // numberOfKeys is formatted as `SPLIT_<indexes>`,
        // eg. a 5-part file will be represented as `SPLIT_5` and have KV values at `<file>_0` to `<file>_4`
        let numberOfKeys = _asStr.split('_')[1];

        // no await so that we can stream the response
        // due to the streamed response, we can't cache the response.
        this.streamKv(numberOfKeys, writable, KV_NAMESPACE, filePath);

        return new Response(readable, {
            headers: customHeaders
        })
    }

    public static async streamKv(numberOfKeys, writable: WritableStream, KV_NAMESPACE: CloudflareWorkerKV, reqpath) {
        let writer = writable.getWriter();
        for (let i = 0; i < numberOfKeys; ++i) {
            writer.releaseLock();
            let a = await KV_NAMESPACE.get(`${reqpath}_${i}`, "stream");
            await a.pipeTo(writable, {preventClose: true});
            writer = writable.getWriter()
        }
        await writer.close()
    }
}
