const AdmZip = require('adm-zip');
const express = require('express');
const multer = require('multer');
const fs = require('fs');
const archiver = require('archiver');
const flash = require('connect-flash');
const session = require('express-session');
const app = express();
const port = 3000;
app.use(session({ secret: 'yoursecret', resave: true, saveUninitialized: true }));

// Connect flash
app.use(flash());

app.use(express.urlencoded({ extended: true }))

let name = "";

app.set('view engine', 'ejs');

app.use(express.static('public'))

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, file.originalname);
    },
});

const pdfstorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'pdfcompressed/');
    },
    filename: (req, file, cb) => {
        cb(null, file.originalname);
    },
});


const upload = multer({ storage: storage });
const pdfupload = multer({ storage: pdfstorage });

app.get('/huffman', (req, res) => {

    const filesize = req.flash('size')

    res.render('option', { filesize });
});

app.post("/huffman", (req, res) => {
    const { choice } = req.body;
    if (choice === "text") {
        res.render("txtupload")
    }
    else if (choice === "pdf") {
        res.render("pdfupload")
    }
})




app.post('/upload', upload.single('file'), (req, res) => {

    console.log(req.file)
    const { filename } = req.file
    name = filename
    if (req.file.size < 20000000) {

        res.render("huffman")
    } else {
        req.flash('size', req.file.size)
        res.redirect('/huffman')
    }

});

function compress() {
    class Node {
        constructor(left = null, right = null) {
            this.left = left;
            this.right = right;
        }
    }

    let dictionary = {};

    function huffmanCode(node, binary = '') {
        if (typeof node === 'string') {
            return { [node]: binary };
        } else {
            const left = node.left;
            const right = node.right;
            Object.assign(dictionary, huffmanCode(left, binary + '0'));
            Object.assign(dictionary, huffmanCode(right, binary + '1'));
        }
        return dictionary;
    }



    const word = fs.readFileSync(`uploads/${name}`, 'utf-8');


    let frequency = {};

    for (const letter of word) {
        if (letter in frequency) {
            frequency[letter] += 1;
        } else {
            frequency[letter] = 1;
        }
    }

    frequency = Object.entries(frequency).sort((a, b) => b[1] - a[1]);

    let nodes = frequency;

    while (nodes.length > 1) {
        const [key1, code1] = nodes[nodes.length - 1];
        const [key2, code2] = nodes[nodes.length - 2];
        nodes = nodes.slice(0, -2);
        const n = new Node(key1, key2);
        nodes.push([n, code1 + code2]);
        nodes.sort((a, b) => b[1] - a[1]);
    }

    const code = huffmanCode(nodes[0][0]);
    let coded = '';

    for (const letter of word) {
        coded += code[letter];
    }

    const binaryArray = binaryStringToUint8Array(coded);

    fs.writeFileSync('compressed/binary_data.bin', binaryArray);
    fs.writeFileSync('compressed/data.json', JSON.stringify(nodes, null, 4));

    const outputFilePath = 'compressed.zip';
    const output = fs.createWriteStream(outputFilePath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', () => {
        console.log('Compression complete!');
    });

    archive.on('error', (err) => {
        throw err;
    });

    archive.pipe(output);
    archive.directory('compressed/', false);
    archive.finalize();



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

function Pdfcompress() {
    const outputFilePath = 'pdfcompressed.zip';
    const output = fs.createWriteStream(outputFilePath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', () => {
        console.log('Compression complete!');
    });

    archive.on('error', (err) => {
        throw err;
    });

    archive.pipe(output);
    archive.directory('pdfcompressed/', false);
    archive.finalize();


}
function Pdfdecompress() {


    function unzipFile(zipFilePath, destinationPath) {
        const zip1 = new AdmZip(zipFilePath);
        zip1.extractAllTo(destinationPath, true);
        console.log('Unzipping complete!');
    }

    // Example usage
    const compressedFilePath = 'uploads/pdfcompressed.zip';
    const extractionPath = 'pdfdecompressed';

    unzipFile(compressedFilePath, extractionPath);

}




function decompress() {
    function decode(code, node) {
        let head = node;
        let ans = '';
        let i = 0;

        while (i < code.length + 1) {
            if (typeof node === 'string') {
                ans += node;
                node = head;
            } else {
                if (i < code.length) {
                    if (code[i] === '0') {
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
                console.error('Error reading file:', err);
                return;
            }

            const binaryArray = Uint8Array.from(data);
            const binaryString = uint8ArrayToBinaryString(binaryArray);
            callback(binaryString);
        });
    }

    function uint8ArrayToBinaryString(uint8Array) {
        let binaryString = '';
        const length = uint8Array.length;

        for (let i = 0; i < length; i++) {
            const byte = uint8Array[i];
            const byteString = byte.toString(2).padStart(8, '0');
            binaryString += byteString;
        }

        return binaryString;
    }

    function unzipFile(zipFilePath, destinationPath) {
        const zip = new AdmZip(zipFilePath);
        zip.extractAllTo(destinationPath, true);
        console.log('Unzipping complete!');
    }

    // Example usage
    const compressedFilePath = 'uploads/compressed.zip';
    const extractionPath = 'unzipped';

    unzipFile(compressedFilePath, extractionPath);


    console.log("here")

    // Example usage
    const filename = 'unzipped/binary_data.bin';
    readBinaryFile(filename, (binaryString) => {
        const tree = fs.readFileSync("unzipped/data.json")
        const tree_parsed = JSON.parse(tree)

        const decoded = decode(binaryString, tree_parsed[0][0]);



        fs.writeFileSync("decompressed.txt", decoded)

    });
}

app.get('/encode', (req, res) => {
    console.log(name)
    compress()
    res.render('decompress_redirect')

})

app.get('/huffman/decompress', (req, res) => {
    res.render('decompress.ejs');
})

app.post('/pdfupload', pdfupload.single('file'), (req, res) => {

    res.render("pdfhuffman")
    console.log(req.file)


})

app.get('/pdfencode', (req, res) => {
    Pdfcompress();
    res.render("pdf_decompress_redirect")

})

app.get("/huffman/pdf-decompress", (req, res) => {
    res.render("pdf_decompress.ejs")
})

app.post("/huffman/pdf-decompress", upload.single('file'), (req, res) => {
    Pdfdecompress();
    res.redirect('/huffman');
})

app.post('/huffman/decompress', upload.single('file'), (req, res) => {
    decompress()
    res.redirect('/huffman')
})

app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});
