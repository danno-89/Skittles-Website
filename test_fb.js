fetch("https://graph.facebook.com/v19.0/118025251701072/feed", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ message: "Test FB Connect", access_token: "EAANbZA6E2HLEBRCBN2eOgIYNlnRHLwcAq9qrZAq9nHouqX8ZCRKEp2Rs1xZBa83tMnOjWJep7KbC73tZAzrymiLZAYNrXhzkU4rnPVjsa3YExfHqZBv7CSNZC2O457RrfShZCZCBcSmqRA34yOJ5yhybx9BmUMJ4xHbbnTqhzibO1r1W3PrZB7fqbY4FaugJECZCW9Ko" })
}).then(r => r.json()).then(console.log)
