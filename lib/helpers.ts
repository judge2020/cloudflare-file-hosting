import * as path from "path";

import Axios from "axios";
import * as fssync from "fs";

const {CLOUDFLARE_AUTH_KEY, CLOUDFLARE_AUTH_EMAIL} = process.env;

export function isDirectory(dirPath) {
    return fssync.statSync(dirPath).isDirectory();
}

export function relativePath(fullPath) {
    return path.relative(process.cwd(), fullPath)
}

export function fileToUri(filePath: string, path: string): string {
    let uriPath = filePath.replace('\\', '/')
        .replace(path, '');
    if (!uriPath.startsWith('/')) {
        uriPath = `/${uriPath}`;
    }
    return uriPath
}

export function splitNChars(txt, num) {
    var result = [];
    for (var i = 0; i < txt.length; i += num) {
        // @ts-ignore
        result.push(txt.substr(i, num));
    }
    return result;
}

export function splitBuffer(buf: Buffer, num) {
    var result: Buffer[] = [];
    for (let i = 0; i < buf.length; i += num) {
        if (i + num > buf.length) {
            result.push(buf.slice(i, buf.length));
        }
        else {
            result.push(buf.slice(i, num));
        }
    }
    return result;
}

// re-implemented this to use Axios because why not?
export async function cfApiCall({url, method, contentType = '', body = null}) {
    return await Axios({
        method: method,
        headers: {
            'X-Auth-Email': CLOUDFLARE_AUTH_EMAIL,
            'X-Auth-Key': CLOUDFLARE_AUTH_KEY,
            'content-type': contentType
        },
        data: body,
        url: url,
        responseType: "json"
    });
}