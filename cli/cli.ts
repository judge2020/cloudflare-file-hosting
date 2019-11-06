#! /usr/bin/env node
import commander from "commander";
import {promises as fs} from "fs";
import * as helpers from "./clihelpers";
import walk from "walkdir";

const {CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_KV_NAMESPACE_ID} = process.env;

// begin CLI
const program = new commander.Command();
program.version('0.2.0')
    .description('Upload large files to Cloudflare using Workers and Workers KV')
    .option('-p, --path <path>', 'Path to root directory of hostname (eg. \"--path dist\" will mean dist/test.css is available at (hostname)/test.css)');

program.parse(process.argv);

// ensure Cloudflare environment variables are passed

if (!CLOUDFLARE_API_TOKEN) {
    console.log('The Environment variable CLOUDFLARE_API_TOKEN need to be set.');
    process.exit(1)
}

let path = program.path;

if (!path) {
    console.log("the \"--path\" argument is required.");
    process.exit(1)
}

// test if the path is a directory
if (!helpers.isDirectory(path)) {
    console.log(`Path passed \"${path}\" is not a directory.`);
    process.exit(1)
}


export async function uploadFile(key, value) {
    return await helpers.cfApiCall({
        url: `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/storage/kv/namespaces/${CLOUDFLARE_KV_NAMESPACE_ID}/values/${key}`,
        method: 'PUT',
        body: value,
        contentType: "application/json"
    });
}

walk(path, {}, async (_filePath, stat) => {
    if (stat.isDirectory()) {
        return;
    }
    let filePath = helpers.relativePath(_filePath);
    let uriPath = helpers.fileToUri(filePath, path);

    let b64Contents = await fs.readFile(filePath, {encoding: null});
    // handle <10mb files
    if (b64Contents.length < 10485760) {
        console.log(`Uploading ${uriPath}...`);
        await uploadFile(uriPath, b64Contents);
        return;
    }

    // file splitting logic for >10mb files
    let b64parts = helpers.splitBuffer(b64Contents, 10485760);

    await uploadFile(uriPath, `SPLIT_${b64parts.length}`);

    b64parts.forEach(async (value: Buffer, index) => {
        let _logName = `${uriPath} part ${index}`;
        console.log(`Uploading ${_logName}...`);
        let result = await uploadFile(`${uriPath}_${index}`, value);
        console.log(_logName, result.data.success ? 'success' : result.data)
    });
});
