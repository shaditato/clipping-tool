const { ipcRenderer } = require('electron')
const { DragGesture } = require('@use-gesture/vanilla');

const container = document.getElementById('container');
const frame = document.getElementById('frame');

const gesture = new DragGesture(container, ({ active, initial: [ix, iy], movement: [mx, my] }) => {
    if (!active) {
        gesture.destroy();
        frame.style.backgroundColor = 'rgba(0, 0, 0, 0)';
        ipcRenderer.send('stopCropping');
    }
    
    const frameStyleNew = { 
        left: `${Math.floor(ix)}px`, 
        top: `${Math.floor(iy)}px`, 
        width: `${Math.floor(mx)}px`, 
        height: `${Math.floor(my)}px` 
    };
    
    if (mx < 0) {
        frameStyleNew.left = `${Math.floor(ix + mx)}px`;
        frameStyleNew.width = `${Math.floor(-mx)}px`;
    }
    if (my < 0) {
        frameStyleNew.top = `${Math.floor(iy + my)}px`;
        frameStyleNew.height = `${Math.floor(-my)}px`
    }
    
    frame.style.left = frameStyleNew.left;
    frame.style.top = frameStyleNew.top;
    frame.style.width = frameStyleNew.width;
    frame.style.height = frameStyleNew.height;
});
