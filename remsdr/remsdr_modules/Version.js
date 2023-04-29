const https = require('https');
const fs = require('fs');
function ReadFile(F) {
    try {
        var data = fs.readFileSync(F, 'utf8');
    } catch (err) {
        console.error(err)
    }
    return data;
}
const Version = {
    Last: "",
    InCpu: ""
}
var list_versions = [];
var list_files = [];
var message = ""
function fctVersion(url) {
    if (url.indexOf("info") > 0) {
        InfoVersion();
        return Version;
    }
    if (url.indexOf("upgrade") > 0) {
        UpgradeVersion();
        return "Ok";
    }
    if (url.indexOf("progress") > 0) {
        var r = message;
        message = "";
        return r;
    }
}
function InfoVersion() {
    var adr_Version = '/remsdr/public/JS/version.js';
    var txt = ReadFile(adr_Version).trim();
    var tab_txt = txt.split("=");
    var tab_txt2 = tab_txt[1].split('"');
    Version.InCpu = parseFloat(tab_txt2[1]);
    var H = "https://f1atb.fr/mes_pages/VersionRemSdr/configuration.php?last_conf";
    https.get(H, (resp) => { //Attention asynchronuous. Delay to obtain result. Valid at next access
        let data = '';
        resp.on('data', (chunk) => {
            data += chunk;
        });
        resp.on('end', () => {
            Version.Last = data.trim();
        });
    }).on("error", (err) => {
        console.log("Error: " + err.message);
        Version.Last = "";
    });
}
InfoVersion();
function UpgradeVersion() {
    var H = "https://f1atb.fr/mes_pages/VersionRemSdr/configuration.php?list_versions";
    https.get(H, (resp) => { //Attention asynchronuous. Delay to obtain result. Valid at next access
        let data = '';
        resp.on('data', (chunk) => {
            data += chunk;
        });
        resp.on('end', () => {
            var Versions = data.trim();
            var tabVersions = Versions.split("|");
            list_versions = [];
            list_files = [];
            for (i = 1; i < tabVersions.length; i++) { //List existing versions
                var V = parseFloat(tabVersions[i]);
                if (V > Version.InCpu && V <= Version.Last) {
                    list_versions.push(tabVersions[i].trim());
                }
            }
            load_version();
            setTimeout(load_files, 2000);
        });
    }).on("error", (err) => {
        console.log("Error: " + err.message);
    });
}
function load_version() {
    if (list_versions.length > 0) {
        var V = list_versions.shift();
        message += "<br>Version : " + V;
        var H = "https://f1atb.fr/mes_pages/VersionRemSdr/configuration.php?list_dir=" + V;
        https.get(H, (resp) => {
            let data = '';
            resp.on('data', (chunk) => {
                data += chunk;
            });
            resp.on('end', () => {
                var L_files = data.trim();
                var tab_files = L_files.split("|");
                for (var i = 1; i < tab_files.length; i++) {
                    list_files.push(tab_files[i]);
                }
                if (list_versions.length > 0)
                    load_version();
            });
        }).on("error", (err) => {
            console.log("Error: " + err.message);
        });
    }
}
function load_files() {
    if (list_files.length > 0) {
        var F = list_files.shift().trim();
        var p = F.indexOf("/"); //First /
        var D = F.slice(p);
        F = "https://f1atb.fr/mes_pages/VersionRemSdr/versions/" + F;
        D = "/remsdr" + D; //Destination
        var L = D.lastIndexOf("/"); // Last /
        var dir = D.slice(0, L);
        fs.mkdir(dir, {
            recursive: true
        }, (err) => {
            if (err) {
                return console.error(err);
            }
            message += "<br>File : " + D;
            download(F, D, cb)
        });
    }
}
function download(url, dest, cb) {
    var file = fs.createWriteStream(dest);
    var request = https.get(url, function (response) {
        response.pipe(file);
        file.on('finish', function () {
            file.close(cb("ok")); // close() is async, call cb after close completes.
            fs.chmod(dest, "777", cb2);
        });
    }).on('error', function (err) { // Handle errors
        fs.unlink(dest); // Delete the file async. (But we don't check the result)
        if (cb)
            cb(err.message);
    });
};
function cb(x) {
    if (list_files.length > 0 && x == "ok") {
        load_files();
    } else {
        if (x == "ok")
            message += "<br>All Files Uploaded. Please REBOOT the system";
    }
}
function cb2() {}
module.exports = {
    fctVersion
};
