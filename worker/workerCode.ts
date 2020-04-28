import CloudflareWorkerGlobalScope, {CloudflareWorkerKV} from 'types-cloudflare-worker';
import fileCore from "../lib/fileCore";

declare var self: CloudflareWorkerGlobalScope;
declare var STATIC_KV: CloudflareWorkerKV;

export class Worker {
    public async handle(event: FetchEvent) {
        if (event.request.method == "POST") {
            let targetname = event.request.headers.get("x-filename");
            let buf = await event.request.arrayBuffer();
            try {
                await STATIC_KV.put(targetname!, buf);
            } catch (e) {
                return new Response(e.message);
            }
            return new Response("success");
        }
        let path = new URL(event.request.url).pathname;
        if (path == '/upload') {
            const html = `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Test upload</title>
  </head>
  <body>
      <input type="file" id="file" />
      <br>
      <label for="filename">File name</label>
      <input type="text" id="filename"/>
      <br>
      <button id="submit">do</button>
    <script>
    document.getElementById("submit").addEventListener('click', async () => {
        let filename = document.getElementById('filename').value;
        if (!filename) {
            alert("please enter a filename");
            return;
        }
        fetch('/upload', {
            method: 'POST',
            headers: {'x-filename': filename},
            body: document.getElementById("file").files[0]
        }).then((/** @type {Response} */ result) => {
            alert(result.body.text());
        })
    })
    </script>
  </body>
</html>
`
            return new Response(html, {headers: {'content-type': 'text/html'}})
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
