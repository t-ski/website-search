const { deepEqual } = require("assert");


let testCaseCount = 0;
process.on("exit", (code) => !code && console.log(`\x1b[32mAll tests passed (${testCaseCount}).\x1b[0m`));
function test(actual, expected) {
    testCaseCount++;
    
    try {
        deepEqual(actual, expected);
        console.log("\x1b[2K\r\x1b[1A\x1b[2K\r\x1b[32m✓\x1b[0m");
    } catch(err) {
        console.error("\x1b[31mTest case failed:\x1b[0m");
        console.error(err);

        process.exit(1);
    }
}


const { Index, Query } = require("../build/api");


function roundScores(queryResults) {
    return queryResults.map(result => {
        result.score = parseFloat(result.score.toFixed(3));
        return result;
    });
}


new Index("./test/test/")
.index()
.then(index => {
    // Single word
    const query1 = new Query(index, "World");

    test(roundScores(query1.results()), [
        {
            document: "bar/baz.html",
            indexes: [
                1
            ],
            score: 1
        },
        {
            document: "bar/qux.txt",
            indexes: [
                1
            ],
            score: 0.667
        },
        {
            document: "bar/quux.js",
            indexes: [
                1
            ],
            score: 0.5
        }
    ]);
    test(!isNaN(query1.time()), true);

    // Multiple words
    test(roundScores(new Query(index, "Hello world").results()), [
        {
            document: 'bar/baz.html',
            indexes: [
                0,
                5
            ],
            score: 1
        },
        {
            document: 'foo.html',
            indexes: [
                3
            ],
            score: 0.676
        },
        {
            document: 'bar/qux.txt',
            indexes: [
                0
            ],
            score: 0.53
        },
        {
            document: 'bar/quux.js',
            indexes: [
                0
            ],
            score: 0.398
        }
    ]);
});