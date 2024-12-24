console.log('Content script loaded');

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Received message:', request);
    
    if (request.action === "extract") {
        if (request.mode === "server") {
            console.log('Starting AI extraction...');
            extractAndSendRecipe();
        } else {
            console.log('Starting local extraction...');
            extractLocally();
        }
    }
});