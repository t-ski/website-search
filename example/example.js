const { Index, Query } = require("../build/api");


new Index("./test/test/")
.index()
.then(index => {
    // Single word
    const query1 = new Query(index, "World");

    console.log("Query: 'World'");
    console.log(query1.results());
    console.log("(in " + query1.time() + "ms)");

    // Multiple words
    const query2 = new Query(index, "Hello world");
    
    console.log("Query: 'Hello world'");
    console.log(query2.results());
});