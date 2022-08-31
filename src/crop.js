const { ipcRenderer } = require('electron')
const { DragGesture } = require('@use-gesture/vanilla');

const container = document.getElementById('container');
const frame = document.getElementById('frame');

const gesture = new DragGesture(container, ({ active, initial: [ix, iy], movement: [mx, my] }) => {    
    // Default crop area dimensions
    const frameStyleNew = { 
        x: Math.floor(ix), 
        y: Math.floor(iy), 
        width: Math.floor(mx), 
        height: Math.floor(my), 
    };
    
    // Handle inverted cropping
    if (mx < 0) {
        frameStyleNew.x = Math.floor(ix + mx);
        frameStyleNew.width = Math.floor(-mx);
    }
    if (my < 0) {
        frameStyleNew.y = Math.floor(iy + my);
        frameStyleNew.height = Math.floor(-my);
    }
    
    // Update crop visual selector
    frame.style.left = `${frameStyleNew.x}px`;
    frame.style.top = `${frameStyleNew.y}px`;
    frame.style.width = `${frameStyleNew.width}px`;
    frame.style.height = `${frameStyleNew.height}px`;

    // End crop on drag stop, dispatch crop dimensions to main process
    if (!active) {
        gesture.destroy();
        frame.style.backgroundColor = 'rgba(0, 0, 0, 0)';
        ipcRenderer.send('stopCropping', frameStyleNew);
    }
});
