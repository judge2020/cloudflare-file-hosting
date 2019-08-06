import {CloudflareWorkerKV} from "types-cloudflare-worker";
import {ArrayBufferToString} from "./workerhelpers";

import * as constants from "../worker/constants";


export default class FileCore {

    public static getContentType(fileName, defaultType = "text/plain", ct = constants.extensionToContentType) {
        let filenamesplit = fileName.split('.');
        let fileExtension = filenamesplit[filenamesplit.length - 1];
        return ct[fileExtension] || defaultType;
    }

    public static async putFile(filePath: string, KV_NAMESPACE: CloudflareWorkerKV, request: Request): Promise<Response> {
        if (filePath.startsWith("/")) {
            filePath = filePath.substr(1);
        }
        let b = await request.blob();
        // @ts-ignore
        await KV_NAMESPACE.put(`${filePath}`, b);
        return new Response("success");
        let {readable, writable} = new TransformStream();
        this.streamPutKv(writable, KV_NAMESPACE, filePath, request);
        return new Response(readable);
    }

    /**
     *
     * @param writableDummy a writable from a transformstream; we use this to trick the runtime into allowing us to upload files larger than 128mb
     * @param KV_NAMESPACE the KV namespace to PUT this to
     * @param path path to the file after upload, including extension
     * @param request incoming request with the body being the raw file
     */
    public static async streamPutKv(writableDummy: WritableStream, KV_NAMESPACE: CloudflareWorkerKV, path, request: Request) {
        let writer = writableDummy.getWriter();

        let blob = await request.blob();

        let splitNum = 2097152;
        if (blob.size < splitNum) {
            // @ts-ignore
            await KV_NAMESPACE.put(`${path}`, blob.slice(0, splitNum));
        }
        for (let i = 0; i < blob.size; i += splitNum) {
            let slice;
            if (i + splitNum > blob.size) {
                slice = blob.slice(i, blob.size)
            } else {
                slice = blob.slice(i, i + splitNum)
            }
            await KV_NAMESPACE.put(`${path}_${i}`, slice);
        }
        await writer.write(new TextEncoder().encode('Success'));
        await writer.close()
    }

    /**
     * Check if a file exists in the specified KV namespace. If so, return a response for that file
     * @param filePath Path to the file, eg `new URL(event.request.url).pathname`
     * @param KV_NAMESPACE a KV namespace binding for your files
     * @param useCache Whether or not to use the cache API. Will only cache files less than 2mb in size.
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

        // we use an arrayBuffer so that, if the file is <2mb, we can instantly return it
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
