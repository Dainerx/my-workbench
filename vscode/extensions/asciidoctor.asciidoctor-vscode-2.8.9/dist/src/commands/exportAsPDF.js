"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.html2pdf = exports.ExportAsPDF = void 0;
const vscode = require("vscode");
const fs = require("fs");
const path = require("path");
const child_process_1 = require("child_process");
const zlib = require("zlib");
const follow_redirects_1 = require("follow-redirects");
const util_1 = require("util");
const child_process_2 = require("child_process");
const text_parser_1 = require("../text-parser");
const tmp = require("tmp");
const url = require("url");
class ExportAsPDF {
    constructor(engine, logger) {
        this.engine = engine;
        this.logger = logger;
        this.id = 'asciidoc.exportAsPDF';
    }
    execute() {
        return __awaiter(this, void 0, void 0, function* () {
            const editor = vscode.window.activeTextEditor;
            if (util_1.isNullOrUndefined(editor))
                return;
            const doc = editor.document;
            const source_name = path.parse(path.resolve(doc.fileName));
            const pdf_filename = vscode.Uri.file(path.join(source_name.root, source_name.dir, source_name.name + '.pdf'));
            const text = doc.getText();
            if (vscode.workspace.getConfiguration('asciidoc', null).get('use_asciidoctorpdf')) {
                var docPath = path.parse(path.resolve(doc.fileName));
                var pdfPath = '';
                var pdfUri = yield vscode.window.showSaveDialog({ defaultUri: pdf_filename });
                if (!util_1.isNullOrUndefined(pdfUri)) {
                    pdfPath = pdfUri.fsPath;
                }
                else {
                    console.error(`ERROR: invalid pdfUri "${pdfUri}"`);
                    return;
                }
                let asciidoctorpdf_command = vscode.workspace
                    .getConfiguration('asciidoc', null)
                    .get('asciidoctorpdf_command', 'asciidoctor-pdf');
                var adocpdf_cmd_array = asciidoctorpdf_command
                    .split(/(\s+)/)
                    .filter(function (e) { return e.trim().length > 0; });
                var adocpdf_cmd = adocpdf_cmd_array[0];
                var adocpdf_cmd_args = adocpdf_cmd_array.slice(1);
                adocpdf_cmd_args.push.apply(adocpdf_cmd_args, ['-q',
                    '-B', '"' + docPath.dir.replace('"', '\\"') + '"',
                    '-o', '"' + pdfPath.replace('"', '\\"') + '"', '-',
                ]);
                var options = { shell: true, cwd: docPath.dir };
                var asciidoctorpdf = child_process_2.spawn(adocpdf_cmd, adocpdf_cmd_args, options);
                asciidoctorpdf.stderr.on('data', (data) => {
                    let errorMessage = data.toString();
                    errorMessage += "\n";
                    errorMessage += "command: " + adocpdf_cmd + " " + adocpdf_cmd_args.join(" ");
                    errorMessage += "\n";
                    errorMessage += "If the asciidoctor-pdf binary is not in your PATH, you can set the full path.";
                    errorMessage += "Go to `File -> Preferences -> User settings` and adjust the asciidoc.asciidoctorpdf_command";
                    console.error(errorMessage);
                    vscode.window.showErrorMessage(errorMessage);
                });
                asciidoctorpdf.on('close', (code) => {
                    offer_open(pdfPath);
                });
                asciidoctorpdf.stdin.write(text);
                asciidoctorpdf.stdin.end();
            }
            else {
                let wkhtmltopdf_path = vscode.workspace
                    .getConfiguration('asciidoc')
                    .get('wkhtmltopdf_path', '');
                let parser = new text_parser_1.AsciidocParser(path.resolve(doc.fileName));
                //const body =  await parser.parseText()
                const body = yield this.engine.render(doc.uri, true, text, false, 'html5');
                const ext_path = vscode.extensions.getExtension('asciidoctor.asciidoctor-vscode').extensionPath;
                const html = body;
                const showtitlepage = parser.getAttribute("showtitlepage");
                const author = parser.getAttribute("author");
                const email = parser.getAttribute("email");
                const doctitle = parser.getAttribute("doctitle");
                const titlepagelogo = parser.getAttribute("titlepagelogo");
                const footer_center = parser.getAttribute("footer-center");
                let cover = undefined;
                let img_html = '';
                if (!util_1.isNullOrUndefined(showtitlepage)) {
                    if (!util_1.isNullOrUndefined(titlepagelogo)) {
                        const image_url = titlepagelogo.startsWith('http') ? titlepagelogo : path.join(source_name.dir, titlepagelogo);
                        img_html = util_1.isNullOrUndefined(titlepagelogo) ? "" : `<img src="${image_url}">`;
                    }
                    var tmpobj = tmp.fileSync({ postfix: '.html' });
                    let html = `\
                <!DOCTYPE html>
                <html>
                    <head>
                    <meta charset="UTF-8">
                    <link rel="stylesheet" type="text/css" href="${ext_path + "/media/all-centered.css"}">
                    </head>
                    <body>
                    <div class="outer">
                        <div class="middle">
                            <div class="inner">
                                ${img_html}
                                <h1>${doctitle}</h1>
                                <p>${author} &lt;${email}&gt;</p>
                            </div>
                        </div>
                    </div>
                    </body>
                </html>
                `;
                    fs.writeFileSync(tmpobj.name, html, 'utf-8');
                    cover = `cover ${tmpobj.name}`;
                }
                const platform = process.platform;
                const ext = platform == "win32" ? '.exe' : '';
                const arch = process.arch;
                var binary_path = path.resolve(path.join(__dirname, 'wkhtmltopdf-' + platform + '-' + arch + ext));
                if (wkhtmltopdf_path != '')
                    binary_path = wkhtmltopdf_path;
                if (!fs.existsSync(binary_path)) {
                    var label = yield vscode.window.showInformationMessage("This feature requires wkhtmltopdf\ndo you want to download", "Download");
                    if (label != "Download")
                        return;
                    var error_msg = null;
                    yield vscode.window.withProgress({
                        location: vscode.ProgressLocation.Window,
                        title: "Downloading wkhtmltopdf",
                    }, (progress) => __awaiter(this, void 0, void 0, function* () {
                        progress.report({ message: 'Downloading wkhtmltopdf...' });
                        const download_url = `https://github.com/joaompinto/wkhtmltopdf/releases/download/v0.0.1/wkhtmltopdf-${platform}-${arch}${ext}.gz`;
                        this.logger.log("Downloading " + download_url);
                        yield download_file(download_url, binary_path + ".gz", progress).then(() => {
                            progress.report({ message: 'Unzipping wkhtmltopdf...' });
                            const ungzip = zlib.createGunzip();
                            const inp = fs.createReadStream(binary_path + ".gz");
                            const out = fs.createWriteStream(binary_path);
                            inp.pipe(ungzip).pipe(out);
                            fs.chmodSync(binary_path, 0x755);
                        }).catch((reason) => __awaiter(this, void 0, void 0, function* () {
                            binary_path = null;
                            console.error("Error downloading", download_url, " ", reason);
                            yield vscode.window.showErrorMessage("Error installing wkhtmltopdf, " + reason.toString());
                            return;
                        }));
                    }));
                    if (util_1.isNullOrUndefined(binary_path))
                        return;
                }
                var save_filename = yield vscode.window.showSaveDialog({ defaultUri: pdf_filename });
                if (!util_1.isNullOrUndefined(save_filename)) {
                    yield html2pdf(html, binary_path, cover, footer_center, save_filename.fsPath)
                        .then((result) => { offer_open(result); })
                        .catch((reason) => {
                        console.error("Got error", reason);
                        vscode.window.showErrorMessage("Error converting to PDF, " + reason.toString());
                    });
                }
            }
        });
    }
}
exports.ExportAsPDF = ExportAsPDF;
function download_file(download_url, filename, progress) {
    return __awaiter(this, void 0, void 0, function* () {
        return new Promise((resolve, reject) => {
            var download_options = url.parse(download_url);
            var wstream = fs.createWriteStream(filename);
            var totalDownloaded = 0;
            // Proxy support needs to be reworked
            // var proxy = process.env.http_proxy || vscode.workspace.getConfiguration("http", null)["proxy"].trim();
            // var proxyStrictSSL = vscode.workspace.getConfiguration("http", null)["proxyStrictSSL"];
            // if (proxy != '')
            // {
            //   var agent = new HttpsProxyAgent(proxy);
            //   download_options.agent = agent
            //   download_options.rejectUnauthorized = proxyStrictSSL
            // }
            follow_redirects_1.https.get(download_options, (resp) => {
                const contentSize = resp.headers['content-length'];
                if (resp.statusCode != 200) {
                    wstream.end();
                    fs.unlinkSync(filename);
                    return reject("http error" + resp.statusCode);
                }
                // A chunk of data has been recieved.
                resp.on('data', (chunk) => {
                    totalDownloaded += chunk.length;
                    progress.report({ message: "Downloading wkhtmltopdf ... " + ((totalDownloaded / contentSize) * 100.).toFixed(0) + "%" });
                    wstream.write(chunk);
                });
                // The whole response has been received. Print out the result.
                resp.on('end', () => {
                    wstream.end();
                    resolve();
                });
            }).on("error", (err) => {
                console.error("Error: " + err.message);
                reject(err.message);
            });
        });
    });
}
function offer_open(destination) {
    // Saving the JSON that represents the document to a temporary JSON-file.
    vscode.window.showInformationMessage(("Successfully converted to " + path.basename(destination)), "Open File").then((label) => {
        if (label == "Open File") {
            switch (process.platform) {
                // Use backticks for unix systems to run the open command directly
                // This avoids having to wrap the command AND path in quotes which
                // breaks if there is a single quote (') in the path
                case 'win32':
                    child_process_1.exec(`"${destination.replace('"', '\\"')}"`);
                    break;
                case 'darwin':
                    child_process_1.exec(`\`open "${destination.replace('"', '\\"')}" ; exit\``);
                    break;
                case 'linux':
                    child_process_1.exec(`\`xdg-open "${destination.replace('"', '\\"')}" ; exit\``);
                    break;
                default:
                    vscode.window.showWarningMessage("Output type is not supported");
                    break;
            }
        }
    });
}
function html2pdf(html, binary_path, cover, footer_center, filename) {
    return __awaiter(this, void 0, void 0, function* () {
        let documentPath = path.dirname(filename);
        return new Promise((resolve, reject) => {
            var options = { cwdir: documentPath, stdio: ['pipe', 'ignore', "pipe"] };
            let cmd_arguments = ['--encoding', ' utf-8', '--javascript-delay', '1000'];
            if (!util_1.isNullOrUndefined(footer_center)) {
                cmd_arguments = cmd_arguments.concat(['--footer-center', footer_center]);
            }
            if (!util_1.isNullOrUndefined(cover)) {
                cmd_arguments = cmd_arguments.concat(cover.split(" "));
            }
            cmd_arguments = cmd_arguments.concat(['-', filename]);
            var command = child_process_2.spawn(binary_path, cmd_arguments, options);
            var error_data = '';
            command.stdin.write(html);
            command.stdin.end();
            command.stderr.on('data', (data) => {
                error_data += data;
            });
            command.on('close', (code) => {
                if (code == 0)
                    resolve(filename);
                else
                    reject(error_data);
            });
        });
    });
}
exports.html2pdf = html2pdf;
//# sourceMappingURL=exportAsPDF.js.map