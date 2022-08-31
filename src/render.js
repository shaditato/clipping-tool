const { ipcRenderer } = require('electron')
const { unlink, writeFile } = require('fs');
const { default: VideoCrop } = require('video-crop');

// Set fluent-ffmpeg ffmpeg path
// * Note: this is essential for the video cropping functionality
const fluentFfmpeg = require('fluent-ffmpeg');
const { path: ffmpegPath } = require('@ffmpeg-installer/ffmpeg');
fluentFfmpeg.setFfmpegPath(ffmpegPath);

// Retrieve main process modules needed in renderer
const desktopCapturer = {
  getSources: (opts) => ipcRenderer.invoke('DESKTOP_CAPTURER_GET_SOURCES', opts)
}

const dialog = {
  showSaveDialog: (opts) => ipcRenderer.invoke('DIALOG_SHOW_SAVE', opts)
}

// Set initial global renderer state
const state = { cropDimensions: undefined, isRecording: false, mediaRecorder: undefined, recordedChunks: [] }

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

ipcRenderer.on('startRecording', (_, cropDimensions) => {
  state.mediaRecorder.start();
  state.isRecording = true;
  state.cropDimensions = cropDimensions;
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

  // Get output file path
  const defaultPath = `clip-${Date.now()}.webm`
  const { filePath } = await dialog.showSaveDialog({ defaultPath });
  const tempPath = `${await ipcRenderer.invoke('TEMP_DIR')}\\${defaultPath}`

  // Crop the video capture to the selected crop area
  if (filePath) {
    const { cropDimensions } = state;
    const opts = {
      input: tempPath,
      output: filePath,
      x: [cropDimensions.x],
      y: [cropDimensions.y],
      height: [cropDimensions.height],
      width: [cropDimensions.width],
    };

    // Create temporary file of uncropped clip
    writeFile(tempPath, buffer, err => {
      if (err) throw err;
      console.log('[Processing] Cropping Clip...');
    });

    // Crop clip by clipDimensions and save to filePath
    const vc = new VideoCrop(opts);
    await vc.run();

    // Delete temporary file
    unlink(tempPath, err => {
      if (err) throw err;
      console.log('[Success] Clip Saved');
    })
  }
}
