// non-exhaustive. Add more to your own deployment if you use other extensions.
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
    'doc': 'application/msword',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
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
    'ppt': 'application/vnd.ms-powerpoint',
    'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
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
    'xls': 'application/vnd.ms-excel',
    'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'xml': 'text/xml',
    'zip': 'application/zip',
    '7z': 'application/x-7z-compressed',
};

addEventListener('fetch', event => {
    event.respondWith(handleRequest(event))
})

async function handleRequest (event) {
    let reqpath = new URL(event.request.url).pathname.replace('%20', ' ')
    if (reqpath === '/') {
        // feel free to change if index.html isn't your index
        reqpath = '/index.html'
    }
    // remove leading slash
    reqpath = reqpath.substr(1)

    // obtain value of key
    let value = await STATIC_KV.get(reqpath)

    // if this isn't in the namespace, 404
    if (value === null) {
        return new Response('file not found', { status: 404 })
    }
    // stitch the files we split during deploy
    if (value.startsWith('SPLIT_')) {
        // file splitting logic
        let numberOfKeys = value.split('_')[1];
        let splitKeys = [];
        for (let i = 0; i < numberOfKeys; i++) {
            let _splitvalue = await STATIC_KV.get(`${reqpath}_${i}`)
            splitKeys.push(_splitvalue)
        }
        value = splitKeys.join('')
    }

    let filenamesplit = reqpath.split('.')
    let fileExtension = filenamesplit[filenamesplit.length - 1]
    let contenttype = extensionToContentType[fileExtension] || "text/plain";


    return new Response(atob(value), {
        headers: {
            'content-type': contenttype,
        },
    })
}

