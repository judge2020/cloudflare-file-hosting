# Cloudflare file hosting

Uses Workers KV to enable Cloudflare as a file host. MIT Licensed.

### Pricing notice

You should know that **Cloudflare Workers always runs in front the CF Cache**. This means none of the files will be cached, and every request made to these files will count against your Workers quota and pricing ($0.50/million after 10 million).

If you use files >10mb then this script will split the file into multiple 10mb parts. Due to this, the script will incur multiple `KV.get` calls (one for file split detection, others per each 10mb part), meaning you will go through your included KV read quota quicker.

The $5/mo workers charge gets you **10 million free KV reads**. You will exhaust your quota depending on the size of files you have. See [this spreadsheet for the pricing quota usage](https://docs.google.com/spreadsheets/d/1seiWWouWcN1vc3RCoCDy0I5-WbZmAwIZRd7K3Ju8WCY/edit?usp=sharing).

### Usage

#### Standalone

See [the wiki](https://github.com/judge2020/cloudflare-file-hosting/wiki/Standalone-usage).

#### Existing worker

the "get file response" method is provided as a library in order to make integrating this into existing workers projects simple.

The API is similar to that of the `caches.default` API where you call the function, then check if the return value is `null`, in which case you continue with other code, or a `Response`, in which case you would immediately return that response.

Use it:

 `npm install cloudflare-file-hosting`

```js
// ES2015 Modules / typescript
import CF_FILES from "cloudflare-file-hosting";

// require / javascript
let CF_FILES = require("cloudflare-file-hosting");

async function handleRequest(request) {
  // FILES_KV is a KV namespace dedicated to the static files
  let url = new URL(request.url)
  let _filesResponse = await CF_FILES.getFile(url.pathname, FILES_KV);
  if (_filesResponse) {
    return _filesResponse;
  }
  /* other code here for when the file wasn't found */
}
```

The standalone worker is a direct example of using this API, see [workerCode.ts](worker/workerCode.ts).

##### Uploading files

To upload files, the following environment variables must be set:

* CLOUDFLARE_API_TOKEN - the API token to use for uploading. Require permission `Workers KV Storage:edit` on the account that owns the namespace.
* CLOUDFLARE_ACCOUNT_ID
* CLOUDFLARE_ZONE_ID
* CLOUDFLARE_KV_NAMESPACE_ID - the KV namespace ID for where to upload files

With these set, run `cfupload --path path/to/root`. You might need to use `node_modules/.bin/cfupload --path path/to/root` instead depending on your PATH setup.

### Limitations

#### Download speeds

Not all Cloudflare regions are optimal for large file downloads. A download from the ATL datacenter with a fiber connection within the same state (Georgia) obtained ~6 MB/s download speeds.

Argo smart routing likely won't have any effect due to the nature of Workers (Argo only routes CF <--> origin better).

#### Upload size and frequency limits

Your uploading may get rate limited by Cloudflare if you have a lot of data to upload and/or are frequently uploading files.

The Cloudflare API request limit is 5000/hour. Each file upload is 1 request and big files that are being split will incur a request per every ~10mb, so you can upload at most 12.5gb before exhausting the limit.

We cannot use bulk upload since it requires uploaded values be UTF-8 encoded strings, which isn't possible for binary data (base64 is not used due to it taking up memory in the worker, where there is a 128mb limit).

#### Cache


At the moment, responses under 10mb in size will be pulled from the Cloudflare cache if possible, but this will still incur a workers request charge (but not a KV get charge). The cache is on a per-datacenter basis.
As far as I know, due to the fact that this uses streamed responses for >10mb files, we can't use the Cache API to prevent incurring charges for KV reads. This is a tradeoff to support files larger than 128mb.

