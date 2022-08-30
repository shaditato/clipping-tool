const { ipcRenderer } = require('electron')
const { writeFile } = require('fs');

const desktopCapturer = {
  getSources: (opts) => ipcRenderer.invoke('DESKTOP_CAPTURER_GET_SOURCES', opts)
}

const dialog = {
  showSaveDialog: (opts) => ipcRenderer.invoke('DIALOG_SHOW_SAVE', opts)
}

// Set initial global renderer state
const state = { isRecording: false, mediaRecorder: undefined, recordedChunks: [] }

// Add record handling functionality to record button
const recBtn = document.getElementById('rec-btn');

recBtn.onclick = async () => {
  if (state.mediaRecorder === undefined) {
    await createMediaRecorder();
  }

  if (state.isRecording) {
    ipcRenderer.send('closeCropWindow');
  } else {
    ipcRenderer.send('selectCropArea');
  }
};

ipcRenderer.on('startRecording', () => {
  state.mediaRecorder.start();
  state.isRecording = true;
  recBtn.innerText = "Stop Recording";
});

ipcRenderer.on('stopRecording', () => {
  state.mediaRecorder.stop();
  state.isRecording = false;
  state.recordedChunks = [];
  recBtn.innerText = "Start Recording";
});


const createMediaRecorder = async () => {
  // Retrieve screen as media source
  const [source] = await desktopCapturer.getSources({
    types: ['screen']
  });

  // Prepare mediaRecorder params
  const constraints = {
    audio: false,
    video: {
      mandatory: {
        chromeMediaSource: 'desktop',
        chromeMediaSourceId: source.id
      }
    }
  };

  const stream = await navigator.mediaDevices.getUserMedia(constraints);
  const options = { mimeType: 'video/webm; codecs=vp9' };

  // Configure mediaRecorder in state
  state.mediaRecorder = new MediaRecorder(stream, options);
  state.mediaRecorder.ondataavailable = handleDataAvailable;
  state.mediaRecorder.onstop = handleStop;
}

// mediaRecorder handlers
const handleDataAvailable = ({ data }) => state.recordedChunks.push(data);
const handleStop = async () => {
  const blob = new Blob(state.recordedChunks, {
    type: 'video/webm; codecs=vp9'
  });

  const buffer = Buffer.from(await blob.arrayBuffer());

  const { filePath } = await dialog.showSaveDialog({
    defaultPath: `clip-${Date.now()}.webm`
  });

  if (filePath) {
    writeFile(filePath, buffer, () => console.log('[Success] Clip Saved'));
  }
}
