# Cloudflare file hosting 

Uses Workers KV to enable Cloudflare as a file host. 

This is currently not recommended for production use.

### Pricing notice

You should know that **Cloudflare Workers always runs in front the CF Cache**. This means none of the files will be cached, and every request made to these files will count against your Workers quota and pricing ($0.50/million after 10 million).

If you use files >2mb then this script will split the file into multiple 2mb parts. Due to this, the script will incur multiple `KV.get` calls (one for file split detection, others per each 2mb part), meaning you will go through your included KV read quota quicker. 

The $5/mo workers charge gets you **10 million free KV reads**. You will exhaust your quota depending on the size of files you have:

|file size (mb)|KV reads|downloads included with subscription|downloads per $1 spend after| 
|---|---|---|---|
|10mb|6|1,666,666|333,333|
|50mb|26|384,615|76,923|
|100mb|51|196,078|39,215|
|200mb|101|99,009|19,801|
|500mb|251|39,840|7,968|
|1gb|501|19,960|3,992|

(estimates)

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

* CLOUDFLARE_AUTH_EMAIL - email of your account
* CLOUDFLARE_AUTH_KEY - **global** API key
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

The Cloudflare API request limit is 5000/hour. Each file upload is 1 request and big files that are being split will incur a request per every ~2mb, so you can upload at most 2.5gb before exhausting the limit.

We cannot use bulk upload since it requires uploaded values be UTF-8 encoded strings, which isn't possible for binary data (base64 is not used due to it taking up memory in the worker, where there is a 128mb limit).

#### Cache


At the moment, responses under 2mb in size will be pulled from the Cloudflare cache if possible. 
As far as I know, due to the fact that this uses streamed responses for >2mb files, we can't use the Cache API to prevent incurring charges for KV reads. This is a tradeoff to support files larger than 128mb. 

In the future, it may be useful to implement cache use different file split logic (the logic from release 0.0.4) if it sees that it the worker likely won't use too much memory (128mb memory limit inside the worker). The file size will likely need to stay under 60mb since the cache API warrants `response.clone()`, effectively doubling the amount of memory the worker is using.

[note: may be able to use the full ~120mb (reserve some for the worker's own memory usage) if `event.waitUntil()` can use the cache API and has its own memory quota.]
