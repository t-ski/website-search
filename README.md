# Website Search

Fast and simple website search (TF-IDF). For HTML and native-text assets.

``` cli
npm i t-ski/website-search
```

## Indexing

``` ts
const index = new Index(path: string, options: {
  minTokenLength: 3,
  punctuationChars: [
    ".", ",", ":", ";", "!", "?", '"', "'", "(", ")", "{", "}", "[", "]"
  ],
  relevantFileExtensions: [ "html", "htm", "txt" ]
})
```

``` ts
index.index()
```

## Querying

``` ts
const query = new Query(index: Index, options: {
  maxResults: 5,
  maxTokenDistance: 2,
  maxTokens: 30,
  scoreThreshold: 0.15
})
```

``` ts
query.results()
```

``` ts
query.time()
```

## Example

``` ts
new Index("./http")
.index()
.then(index => {
  const query = (search: string) = {
    const query = new Query(index, search);
    
    console.log(`Query: '${search}'`);

    console.log(query.results());

    console.log(`Duration: '${query.time()}'`);
  };
});
```

##

<sub>&copy; Thassilo Martin Schiepanski</sub>