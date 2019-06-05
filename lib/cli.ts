#!/usr/bin/env node
import commander from "commander";
import {promises as fs} from "fs";
import * as helpers from "./helpers";
import walk from "walkdir";

const {cfApiCall} = require("cloudflare-workers-toolkit/src/api");

const {CLOUDFLARE_AUTH_KEY, CLOUDFLARE_AUTH_EMAIL, CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_KV_NAMESPACE_ID} = process.env;

// begin CLI
const program = new commander.Command();
program.version('0.0.1')
    .description('Upload files to Cloudflare using Workers and Workers KV')
    .option('-p, --path <path>', 'Path to root directory of hostname (eg. \"--path dist\" will mean dist/test.css is available at (hostname)/test.css)');

program.parse(process.argv);

// ensure Cloudflare environment variables are passed

if (!(CLOUDFLARE_AUTH_EMAIL && CLOUDFLARE_AUTH_KEY))  {
    console.log('The Environment variables CLOUDFLARE_AUTH_EMAIL and CLOUDFLARE_AUTH_KEY need to be set.');
    process.exit(1)
}

let path = program.path;

if (!path) {
    console.log("the \"--path\" argument is required.");
    process.exit(1)
}

// test if the path is a directory
if (!helpers.isDirectory(path)){
    console.log(`Path passed \"${path}\" is not a directory.`);
    process.exit(1)
}


async function uploadFile(key, value) {
    console.log(`Uploading ${key}...`);
    let cfresult = await cfApiCall({
        url: `/accounts/${CLOUDFLARE_ACCOUNT_ID}/storage/kv/namespaces/${CLOUDFLARE_KV_NAMESPACE_ID}/values/${key}`,
        method: 'PUT',
        body: value,
        contentType: "application/json"
    });
    console.log(cfresult);
    return cfresult;
}

walk(path, {}, async (_filePath, stat) => {
    if (stat.isDirectory()){
        return;
    }
    let filePath = helpers.relativePath(_filePath);
    let uriPath = helpers.fileToUri(filePath, path);

    let b64Contents = await fs.readFile(filePath, {encoding: "base64"});

    if (b64Contents.length < 2097152) {
        await uploadFile(uriPath, b64Contents);
        return;
    }
    // file splitting logic
    let b64parts = helpers.splitNChars(b64Contents, 2097152);

    uploadFile(uriPath, `SPLIT_${b64parts.length}`);

    b64parts.forEach((value, index) => {
        uploadFile(`${uriPath}_${index}`, value)
    });
});
