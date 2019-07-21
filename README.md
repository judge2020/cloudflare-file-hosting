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

### Limitations

#### Download speeds

Not all Cloudflare regions are optimal for large file downloads. A download from the ATL datacenter with a fiber connection within the same state (Georgia) obtained ~6 MB/s download speeds. 



#### Upload size and frequency limits

Your uploading may get rate limited by Cloudflare if you have a lot of data to upload and/or are frequently uploading files. 

The Cloudflare API request limit is 5000/hour. Each file upload is 1 request and big files that are being split will incur a request per every ~2mb, so you can upload at most 2.5gb before exhausting the limit.

We cannot use bulk upload since it requires uploaded values be UTF-8 encoded strings, which isn't possible for binary data (base64 is not used due to it taking up memory in the worker, where there is a 128mb limit).

#### Cache


At the moment, responses under 2mb in size will be pulled from the Cloudflare cache if possible. 
As far as I know, due to the fact that this uses streamed responses for >2mb files, we can't use the Cache API to prevent incurring charges for KV reads. This is a tradeoff to support files larger than 128mb. 

In the future, it may be useful to implement cache use different file split logic (the logic from release 0.0.4) if it sees that it the worker likely won't use too much memory (128mb memory limit inside the worker). The file size will likely need to stay under 60mb since the cache API warrants `response.clone()`, effectively doubling the amount of memory the worker is using.

[note: may be able to use the full ~120mb (reserve some for the worker's own memory usage) if `event.waitUntil()` can use the cache API and has its own memory quota.]
