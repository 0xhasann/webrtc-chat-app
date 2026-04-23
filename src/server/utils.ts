import { IncomingMessage, ServerResponse } from "http";
import { readFile, existsSync } from "fs";
import { extname, join } from "path";

export const PORT = process.env.PORT || 3000;


const mimeTypes: Record<string, string> = {
    ".html": "text/html",
    ".js": "application/javascript",
    ".css": "text/css",
    ".json": "application/json",
    ".ico": "image/x-icon",
    ".txt": "text/plain"
};
// reads the file from the filepath and 
// if read fail then handle error 
// else set the res, writeHead as code and content-type and the content into it.
const serveStaticFile = (
    res: ServerResponse,
    filePath: string,
    contentType: string
): void => {
    readFile(filePath, (err, content) => {
        if (err) {
            res.writeHead(500);
            res.end("Internal Server Error");
        } else {
            res.writeHead(200, { "Content-Type": contentType });
            res.end(content);
        }
    });
};

export const log = (text: string): void => {
    const time = new Date();
    console.log(`[${time.toLocaleTimeString()}] ${text}`);
};

// handle req and serve res
// fetch the process path and goto html file
// 
// if req.url is '/' then fetches index.html under public directory file path
// else set the file path as req.url as suffix on path under public directory.
// if filepath doesn't exist we send 404
export const handleWebRequest = (
    req: IncomingMessage,
    res: ServerResponse
): void => {
    log(`Received request for ${req.url}`);
    const filePath = req.url === "/"
        ? join(process.cwd(), "public", "index.html")
        : join(process.cwd(), "public", req.url!);
    const ext = extname(filePath);
    const contentType = mimeTypes[ext] || "application/octet-stream";

    if (!existsSync(filePath)) {
        res.writeHead(404);
        res.end("404 Not Found");
        return;
    }

    serveStaticFile(res, filePath, contentType);
};