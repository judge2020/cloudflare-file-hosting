# Cloudflare file hosting 

Uses Workers KV to enable Cloudflare as a file host. This is currently unstable.

### Pricing notice

You should know that **Cloudflare Workers always runs in front the CF Cache**. This means none of the files will be cached, and every request made to these files will count against your Workers quota and pricing ($0.50/million) (They should still be served relatively quickly).

### Limitations

Currently only works with text-based files (html, js, css, etc).
