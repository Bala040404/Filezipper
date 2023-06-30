//min heap data structure

function heapify(arr, size, i) {
    let l = 2 * i;
    let r = 2 * i + 1;
    let smallest = i;

    if (l <= size && arr[l][1] < arr[smallest][1]) {
        smallest = l;
    }
    if (r <= size && arr[r][1] < arr[smallest][1]) {
        smallest = r;
    }

    if (smallest !== i) {
        let x = arr[smallest];
        arr[smallest] = arr[i];
        arr[i] = x;

        heapify(arr, size, smallest);
    }
}

function heap_util(arr, size) {
    let n = size - 1;
    for (let i = n; i >= 1; i--) {
        heapify(arr, n, i);
    }
}

function getmin(arr) {
    let size = arr.length - 1;
    let min = arr[1];
    arr[1] = arr[size];
    arr.pop();
    size = size - 1;
    heap_util(arr, size);
    return min;
}

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//required modules
const AdmZip = require("adm-zip");
const express = require("express");
const multer = require("multer");
const fs = require("fs");
const archiver = require("archiver");
const flash = require("connect-flash");
const session = require("express-session");
const path = require("path")

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


//initialisation
const app = express();
const port = 3000;
app.use(
    session({ secret: "secret", resave: true, saveUninitialized: true })
);


app.use(flash());

app.use(express.urlencoded({ extended: true }));

let name = [];

app.set("view engine", "ejs");

app.use(express.static("public"));

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "uploads/");
    },
    filename: (req, file, cb) => {
        cb(null, file.originalname);
    },
});

const pdfstorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "pdfcompressed/");
    },
    filename: (req, file, cb) => {
        cb(null, file.originalname);
    },
});

const upload = multer({ storage: storage });
const pdfupload = multer({ storage: pdfstorage });

//necessary routes

app.get("/home", (req, res) => {
    const filesize = req.flash("size");
    res.render("option", { filesize });
});

app.post("/home", (req, res) => {
    const { choice } = req.body;
    if (choice === "text") {
        res.render("txtupload");
    } else if (choice === "pdf") {
        deleteFolderContents('./pdfcompressed');
        res.render("pdfupload");
    }
});

//PDF related routes
app.post("/pdf", pdfupload.array("file"), (req, res) => {
    name = req.files;
    let size = 0;
    for (let file of name) {
        size += file.size;
    }
    if (size < 20000000) {
        Pdfcompress();
        res.render("pdf_downloadpage");
    } else {
        req.flash("size", size);
        res.redirect("/home");
    }
});

app.get("/pdfdecompress", (req, res) => {
    res.render("pdf_decompress.ejs");
});

app.get("/pdfupload/pdfdownloaded", (req, res) => {
    res.download('./pdfcompressed.zip')
})

app.post("/pdfdecompress", upload.single("file"), (req, res) => {
    Pdfdecompress(req.file.filename);
    res.redirect('/home')
});

//TXT related
app.post("/txt", upload.array("file"), (req, res) => {
    name = req.files;
    let size = 0;
    for (let file of name) {
        size += file.size;
    }
    if (size < 20000000) {
        compress();
        res.render("text_downloadpage");
    } else {
        req.flash("size", size);
        res.redirect("/home");
    }
});


app.get("/encode/downloaded", (req, res) => {
    res.download('./compressed.zip')
})
app.get("/decompress", (req, res) => {
    res.render("decompress.ejs");
});


app.post("/decompress", upload.single("file"), (req, res) => {
    decompress(req.file.filename);
    res.render("decompressed_text_downloadpage");
});

app.get('/decompressed/download', (req, res) => {
    res.download(`./decompressed.${extension}`)

})


///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// function to compress text files
let extension = "";

function compress() {
    class Node {
        constructor(left = null, right = null) {
            this.left = left;
            this.right = right;
        }
    }

    let dictionary = {};

    function huffmanCode(node, binary = "") {
        if (typeof node === "string") {
            return { [node]: binary };
        } else {
            const left = node.left;
            const right = node.right;
            Object.assign(dictionary, huffmanCode(left, binary + "0"));
            Object.assign(dictionary, huffmanCode(right, binary + "1"));
        }
        return dictionary;
    }

    let frequency = [[undefined, undefined]];
    let word = "";
    extension = name[0].originalname.split('.').pop();
    for (let i = 0; i < name.length; i++) {

        word = word + fs.readFileSync(`uploads/${name[i].originalname}`, "utf-8");
    }

    for (const letter of word) {
        let found = false;

        for (let i = 0; i < frequency.length; i++) {
            if (frequency[i][0] === letter) {
                frequency[i][1] += 1;
                found = true;
                break;
            }
        }

        if (!found) {
            frequency.push([letter, 1]);
        }
    }
    console.log(extension)

    let nodes = frequency;

    while (nodes.length > 2) {
        //using the heaps get min function
        const [key1, code1] = getmin(nodes);
        const [key2, code2] = getmin(nodes);

        const n = new Node(key1, key2);
        nodes.push([n, code1 + code2]);
        heap_util(nodes, nodes.length);
    }


    const code = huffmanCode(nodes[1][0]);
    let coded = "";

    for (const letter of word) {
        coded += code[letter];
    }

    //converting the strings of one and zeros to binary
    const binaryArray = binaryStringToUint8Array(coded);

    //writing the binaryarray to .bin file
    fs.writeFileSync("compressed/binary_data.bin", binaryArray);

    //writing the huffmantree to json file
    fs.writeFileSync("compressed/data.json", JSON.stringify(nodes, null, 4));

    const outputFilePath = "compressed.zip";
    const output = fs.createWriteStream(outputFilePath);
    const archive = archiver("zip", { zlib: { level: 9 } });

    output.on("close", () => {
        console.log("Compression complete!");
    });

    archive.on("error", (err) => {
        throw err;
    });

    archive.pipe(output);
    archive.directory("compressed/", false);
    archive.finalize();


    //the function which converts string of ones and zero to binary array

    function binaryStringToUint8Array(binaryString) {
        const length = binaryString.length;
        const uint8Array = new Uint8Array(length / 8);

        for (let i = 0; i < length; i += 8) {
            const byteString = binaryString.substr(i, 8);
            const byteValue = parseInt(byteString, 2);
            uint8Array[i / 8] = byteValue;
        }

        return uint8Array;
    }
}


// /////////////////////////////////////////// /////////////////////////////////////////// /////////////////////////////////////////// /////////////////////////////////////////// /////////////////////////////////////////  
// function to compress pdf files 
function Pdfcompress() {
    const outputFilePath = "pdfcompressed.zip";
    const output = fs.createWriteStream(outputFilePath);
    const archive = archiver("zip", { zlib: { level: 9 } });

    output.on("close", () => {
        console.log("Compression complete!");
    });

    archive.on("error", (err) => {
        throw err;
    });

    archive.pipe(output);
    archive.directory("pdfcompressed/", false);
    archive.finalize();
}

///////////////////////////////////////////// /////////////////////////////////////////// /////////////////////////////////////////// /////////////////////////////////////////// ////////////////////////////////////////
// function to decompress text files
function decompress(compressedfilename) {
    function decode(code, node) {
        let head = node;
        let ans = "";
        let i = 0;

        while (i < code.length + 1) {
            if (typeof node === "string") {
                ans += node;
                node = head;
            } else {
                if (i < code.length) {
                    if (code[i] === "0") {
                        node = node.left;
                    } else {
                        node = node.right;
                    }
                }
                i++;
            }
        }
        return ans;
    }

    function readBinaryFile(filename, callback) {
        fs.readFile(filename, (err, data) => {
            if (err) {
                console.error("Error reading file:", err);
                return;
            }

            const binaryArray = Uint8Array.from(data);
            const binaryString = uint8ArrayToBinaryString(binaryArray);
            callback(binaryString);
        });
    }

    function uint8ArrayToBinaryString(uint8Array) {
        let binaryString = "";
        const length = uint8Array.length;

        for (let i = 0; i < length; i++) {
            const byte = uint8Array[i];
            const byteString = byte.toString(2).padStart(8, "0");
            binaryString += byteString;
        }

        return binaryString;
    }

    function unzipFile(zipFilePath, destinationPath) {
        const zip = new AdmZip(zipFilePath);
        zip.extractAllTo(destinationPath, true);
        console.log("Unzipping complete!");
    }

    const compressedFilePath = `uploads/${compressedfilename}`;
    const extractionPath = "unzipped";

    unzipFile(compressedFilePath, extractionPath);

    const filename = "unzipped/binary_data.bin";

    readBinaryFile(filename, (binaryString) => {
        const tree = fs.readFileSync("unzipped/data.json");
        const tree_parsed = JSON.parse(tree);

        const decoded = decode(binaryString, tree_parsed[1][0]);
        let newname = "decompressed." + extension
        console.log(newname)
        fs.writeFileSync(newname, decoded);
    });
}
// /////////////////////////////////////////// /////////////////////////////////////////// /////////////////////////////////////////// /////////////////////////////////////////// /////////////////////////////////////////
// function to decompress pdf files
function Pdfdecompress(compressedpdf) {
    deleteFolderContents('./pdfdecompressed');
    function unzipFile(zipFilePath, destinationPath) {
        const zip1 = new AdmZip(zipFilePath);
        zip1.extractAllTo(destinationPath, true);
        console.log("Unzipping complete!");
    }

    const compressedFilePath = `uploads/${compressedpdf}`;
    const extractionPath = "pdfdecompressed";

    unzipFile(compressedFilePath, extractionPath);
}


///////////////////////////////////////////////////////////////////////////////
function deleteFolderContents(folderPath) {
    fs.readdir(folderPath, (err, files) => {
        if (err) {
            console.error('Error reading folder:', err);
            return;
        }

        files.forEach((file) => {
            const filePath = path.join(folderPath, file);

            fs.stat(filePath, (err, stat) => {
                if (err) {
                    console.error('Error retrieving file information:', err);
                    return;
                }

                if (stat.isDirectory()) {
                    deleteFolderContents(filePath); // Recursively delete subfolders
                } else {
                    fs.unlink(filePath, (err) => {
                        if (err) {
                            console.error('Error deleting file:', err);
                            return;
                        }


                    });
                }
            });
        });
    });
}


app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});


