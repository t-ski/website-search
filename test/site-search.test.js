const { Index } = require("../build/api");


new Index("./test/test/")
.index()
.then(index => {
    console.log("QUERY: world':");
    console.log(index.query("world"));
});