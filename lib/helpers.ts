import * as path from "path";

import * as fssync from "fs";


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
    return  uriPath
}

export function splitNChars(txt, num) {
    var result = [];
    for (var i = 0; i < txt.length; i += num) {
        // @ts-ignore
        result.push(txt.substr(i, num));
    }
    return result;
}
