document.getElementById('serverBtn').addEventListener('click', handleServerExtraction);
document.getElementById('localBtn').addEventListener('click', handleLocalExtraction);

async function handleServerExtraction() {
    try {
        console.log('Server extraction clicked');
        const [tab] = await chrome.tabs.query({ 
            active: true, 
            currentWindow: true 
        });
        
        await chrome.tabs.sendMessage(tab.id, { 
            action: "extract",
            mode: "server"
        });
    } catch (error) {
        console.error('Error:', error);
    }
}

async function handleLocalExtraction() {
    try {
        console.log('Local extraction clicked');
        const [tab] = await chrome.tabs.query({ 
            active: true, 
            currentWindow: true 
        });
        
        await chrome.tabs.sendMessage(tab.id, { 
            action: "extract",
            mode: "local"
        });
    } catch (error) {
        console.error('Error:', error);
    }
}