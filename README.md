# Cloudflare file hosting 

Uses Workers KV to enable Cloudflare as a file host. This is currently unstable.

### Pricing notice

You should know that **Cloudflare Workers always runs in front the CF Cache**. This means none of the files will be cached, and every request made to these files will count against your Workers quota and pricing ($0.50/million) (They should still be served relatively quickly).

If you use files >2mb then this script will split the file into multiple 2mb parts. Due to this, the script will incur multiple `KV.get` calls, meaning you will go through your included KV read quota quicker. This should only be a concern if this script will see extremely high download traffic.

### Limitations

#### Upload limits

Your uploading may get rate limited by Cloudflare if you have a lot of data to upload and/or are frequently uploading files. 

The Cloudflare API request limit is 5000/hour. Each file upload is 1 request and big files that are being split will incur a request per every ~2mb, so you can upload at most 2.5gb before exhausting the limit.

We cannot use bulk upload since it requires uploaded values be UTF-8 encoded strings, which isn't possible for binary data (base64 is impossible due to it taking up memory in the worker, where there is a 128mb limit).
