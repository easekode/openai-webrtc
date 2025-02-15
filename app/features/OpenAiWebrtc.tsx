'use client';

import { useRef, useState } from 'react';

const WebrtcDemo = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [transcript, setTranscript] = useState<string>('');
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  // Capture audio and set up WebRTC connection
  const setupWebRTC = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const peerConnection = new RTCPeerConnection();
      stream
        .getTracks()
        .forEach((track) => peerConnection.addTrack(track, stream));

      peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          console.log('ICE candidate:', event.candidate);
        }
      };

      peerConnection.onconnectionstatechange = () => {
        setIsConnected(peerConnection.connectionState === 'connected');
      };

      peerConnection.ontrack = (event) => {
        const el = document.createElement('audio');
        el.srcObject = event.streams[0];
        el.autoplay = el.controls = true;
        document.body.appendChild(el);
      };

      const dataChannel = peerConnection.createDataChannel('response');
      dataChannel.onmessage = (event) => {
        console.log('Received message:', event.data);
        const transcript = JSON.parse(event?.data)?.response?.output[0]
          ?.content[0]?.transcript;
        if (transcript) {
          setTranscript(transcript);
        }
      };

      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);

      console.log('Local offer created:', offer);

      // Fetch the remote SDP (replace this with your real API call)
      const remoteSdp = await exchangeSdp(offer.sdp);
      await peerConnection.setRemoteDescription(
        new RTCSessionDescription({ type: 'answer', sdp: remoteSdp })
      );

      console.log('Remote description set');
      peerConnectionRef.current = peerConnection;
    } catch (error) {
      console.error('Error setting up WebRTC:', error);
    }
  };

  const exchangeSdp = async (offerSdp: string | undefined): Promise<string> => {
    console.log('Sending offer SDP to backend:', offerSdp);
    const response = await fetch('/api/webrtc', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sdp: offerSdp }),
    });

    if (!response.ok) {
      console.error('Failed to fetch remote SDP:', response.statusText);
      return '';
    }

    const remoteSdp = await response.text();
    return remoteSdp;
  };

  const closeWebRTC = () => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    setIsConnected(false);
    setTranscript('');
  };

  return (
    <div className='flex items-center justify-center flex-col'>
      <h1 className='p-10'>WebRTC Demo with OpenAI</h1>
      <div className='p-5'>
        Status: {isConnected ? 'Connected' : 'Disconnected'}
      </div>
      <button
        className='bg-slate-600 text-white p-3'
        onClick={isConnected ? closeWebRTC : setupWebRTC}
      >
        {isConnected ? 'Disconnect' : 'Start WebRTC'}
      </button>
      <div className='p-5'>
        {transcript && <p>AI Response: {transcript}</p>}
      </div>
      {isConnected && <p>WebRTC is connected!</p>}
    </div>
  );
};

export default WebrtcDemo;
